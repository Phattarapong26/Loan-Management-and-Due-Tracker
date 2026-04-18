import axios from 'axios';
import { env } from '@config/env.config';
import { prisma } from '@config/database.config';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';
const LINE_DATA_API = 'https://api-data.line.me/v2/bot';

/**
 * Rich Menu Manager Service
 * 
 * Purpose: Manage role-based Rich Menus for LINE Official Account
 * Features:
 * - Create and manage Rich Menus for different user roles
 * - Assign Rich Menus based on user role
 * - Update Rich Menus when user role changes
 * - Store Rich Menu IDs in SystemConfig
 * 
 * Requirements: Requirement 4 - Role-Based Rich Menu Implementation
 */

interface RichMenuSize {
    width: number;
    height: number;
}

interface RichMenuBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface RichMenuArea {
    bounds: RichMenuBounds;
    action: {
        type: string;
        label?: string;
        data?: string;
        uri?: string;
        text?: string;
    };
}

interface RichMenuConfig {
    size: RichMenuSize;
    selected: boolean;
    name: string;
    chatBarText: string;
    areas: RichMenuArea[];
}

export class RichMenuManager {
    private accessToken: string;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY_MS = 1000;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
    }

    private createSimpleRichMenuImage(role: string): Buffer {
        const normalizedRole = this.normalizeRoleForRichMenu(role);
        const width = 2500;
        const height = 1686;

        const colors: Record<string, { r: number; g: number; b: number }> = {
            CUSTOMER: { r: 0, g: 170, b: 91 },
            USER: { r: 0, g: 170, b: 91 },
            OFFICER: { r: 0, g: 102, b: 204 },
            MANAGER: { r: 255, g: 107, b: 53 },
            ADMIN: { r: 139, g: 92, b: 246 },
            DEFAULT: { r: 107, g: 114, b: 128 },
        };
        const color = colors[normalizedRole] ?? colors.DEFAULT!;

        const rowBytes = width * 3 + 1;
        const imageData = Buffer.alloc(rowBytes * height);
        for (let y = 0; y < height; y++) {
            const rowStart = y * rowBytes;
            imageData[rowStart] = 0;
            for (let x = 0; x < width; x++) {
                const pixelStart = rowStart + 1 + x * 3;
                imageData[pixelStart] = color.r;
                imageData[pixelStart + 1] = color.g;
                imageData[pixelStart + 2] = color.b;
            }
        }

        const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        const ihdrData = Buffer.alloc(13);
        ihdrData.writeUInt32BE(width, 0);
        ihdrData.writeUInt32BE(height, 4);
        ihdrData.writeUInt8(8, 8);
        ihdrData.writeUInt8(2, 9);
        ihdrData.writeUInt8(0, 10);
        ihdrData.writeUInt8(0, 11);
        ihdrData.writeUInt8(0, 12);

        const ihdr = Buffer.concat([
            Buffer.from([0x00, 0x00, 0x00, 0x0D]),
            Buffer.from('IHDR'),
            ihdrData,
            this.calculateCRC(Buffer.concat([Buffer.from('IHDR'), ihdrData])),
        ]);

        const compressedData = zlib.deflateSync(imageData);
        const idat = Buffer.concat([
            Buffer.alloc(4),
            Buffer.from('IDAT'),
            compressedData,
            this.calculateCRC(Buffer.concat([Buffer.from('IDAT'), compressedData])),
        ]);
        idat.writeUInt32BE(compressedData.length, 0);

        const iend = Buffer.concat([
            Buffer.from([0x00, 0x00, 0x00, 0x00]),
            Buffer.from('IEND'),
            this.calculateCRC(Buffer.from('IEND')),
        ]);

        return Buffer.concat([signature, ihdr, idat, iend]);
    }

    private getRoleRichMenuImagePath(role: string): string | null {
        const normalizedRole = this.normalizeRoleForRichMenu(role);
        const filenames: Record<string, string> = {
            CUSTOMER: 'customer.png',
            USER: 'customer.png',
            OFFICER: 'officer.png',
            MANAGER: 'manager.png',
            ADMIN: 'admin.png',
        };

        const filename = filenames[normalizedRole];
        if (!filename) return null;

        // Primary: backend/assets/rich-menus/ (images stored in repo)
        const primaryPath = path.resolve(__dirname, '../../../assets/rich-menus', filename);
        if (fs.existsSync(primaryPath)) return primaryPath;

        // Fallback: ../public/richmenu/ (legacy path)
        return path.resolve(__dirname, '../../../public/richmenu', filename);
    }

    private tryReadRoleRichMenuImage(role: string): Buffer | null {
        try {
            const imagePath = this.getRoleRichMenuImagePath(role);
            if (!imagePath) return null;
            if (!fs.existsSync(imagePath)) return null;

            const stats = fs.statSync(imagePath);
            // LINE Rich Menu image max size is 1MB
            if (stats.size > 1_000_000) return null;

            return fs.readFileSync(imagePath);
        } catch {
            return null;
        }
    }

    private calculateCRC(data: Buffer): Buffer {
        const crcTable = this.makeCRCTable();
        let crc = 0xffffffff;

        for (let i = 0; i < data.length; i++) {
            const tableIndex = (crc ^ data[i]!) & 0xff;
            const tableValue = crcTable[tableIndex];
            if (tableValue !== undefined) {
                crc = tableValue ^ (crc >>> 8);
            }
        }

        const result = Buffer.alloc(4);
        result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
        return result;
    }

    private makeCRCTable(): number[] {
        const crcTable: number[] = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
        }
        return crcTable;
    }

    private normalizeRoleForRichMenu(role: string): string {
        const normalized = (role || '').toUpperCase().trim();
        return normalized;
    }

    private async getUserRichMenuId(lineUserId: string): Promise<string | null> {
        try {
            const response = await axios.get(
                `${LINE_MESSAGING_API}/user/${lineUserId}/richmenu`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }
            );

            return response.data?.richMenuId ?? null;
        } catch (error: any) {
            // 404 means no rich menu linked
            if (error.response?.status === 404) {
                return null;
            }
            console.error('Error getting user Rich Menu:', error.response?.data || error.message);
            return null;
        }
    }

    private async getExpectedRichMenuId(role: string): Promise<string | null> {
        const normalizedRole = this.normalizeRoleForRichMenu(role);
        let richMenuId = await this.getRichMenuId(normalizedRole);

        // Only CUSTOMER/USER are interchangeable fallbacks (legacy compatibility)
        if (!richMenuId && (normalizedRole === 'CUSTOMER' || normalizedRole === 'USER')) {
            richMenuId = await this.getRichMenuId(normalizedRole === 'CUSTOMER' ? 'USER' : 'CUSTOMER');
        }

        return richMenuId;
    }

    async ensureRichMenu(lineUserId: string, role: string): Promise<boolean> {
        try {
            const expectedRichMenuId = await this.getExpectedRichMenuId(role);
            if (!expectedRichMenuId) {
                console.error(`Rich Menu ID not found for role: ${role}`);
                return false;
            }

            const currentRichMenuId = await this.getUserRichMenuId(lineUserId);
            if (currentRichMenuId && currentRichMenuId === expectedRichMenuId) {
                return true;
            }

            // Assign the expected menu (this overwrites any existing)
            return await this.assignRichMenu(lineUserId, role);
        } catch (error: any) {
            console.error('Error ensuring Rich Menu:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Task 4.1.2: Customer Rich Menu Configuration (Single Page, 6 buttons)
     * 
     * Layout:
     * [ยอดคงเหลือ] [กำหนดชำระ] [ตารางชำระ]
     * [ประวัติ]    [ใบแจ้งหนี้] [ติดต่อเรา]
     */
    private getCustomerRichMenuConfig(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686,
            },
            selected: true,
            name: 'Customer Menu',
            chatBarText: 'เมนู',
            areas: [
                // Row 1: ยอดคงเหลือ (BALANCE)
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ยอดคงเหลือ',
                        text: 'ยอดคงเหลือ',
                    },
                },
                // Row 1: กำหนดชำระ (PAYMENT DUE)
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'กำหนดชำระ',
                        text: 'กำหนดชำระ',
                    },
                },
                // Row 1: ตารางชำระ (SCHEDULE)
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ตารางชำระ',
                        text: 'ตารางชำระ',
                    },
                },
                // Row 2: ประวัติ (HISTORY)
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ประวัติการชำระ',
                        text: 'ประวัติการชำระ',
                    },
                },
                // Row 2: ใบแจ้งหนี้ (INVOICE)
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ใบแจ้งหนี้',
                        text: 'ใบแจ้งหนี้',
                    },
                },
                // Row 2: สัญญาหนี้ (loan contract)
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'สัญญา',
                        text: 'สัญญา',
                    },
                },
            ],
        };
    }

    /**
     * Task 4.1.3: Loan Officer Rich Menu Configuration (Multi-page)
     * 
     * Layout:
     * [งานวันนี้]  [บันทึก]    [แดชบอร์ด]
     * [ลูกค้า]     [สินเชื่อ]   [เมนู]
     */
    private getLoanOfficerRichMenuConfig(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686,
            },
            selected: true,
            name: 'Loan Officer Menu',
            chatBarText: 'เมนูเจ้าหน้าที่',
            areas: [
                // Row 1: งานวันนี้ (WORK)
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'งานวันนี้',
                        text: 'งานวันนี้',
                    },
                },
                // Row 1: บันทึก (UPDATE)
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'บันทึก',
                        text: 'บันทึก',
                    },
                },
                // Row 1: แดชบอร์ด (DASHBOARD)
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'แดชบอร์ด',
                        text: 'แดชบอร์ด',
                    },
                },
                // Row 2: ลูกค้า (CUSTOMER)
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ลูกค้า',
                        text: 'ลูกค้า',
                    },
                },
                // Row 2: สินเชื่อ (LOAN)
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'สินเชื่อ',
                        text: 'สินเชื่อ',
                    },
                },
                // Row 2: เมนู (MENU)
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'เมนู',
                        text: 'เมนู',
                    },
                },
            ],
        };
    }

    /**
     * Task 4.1.4: Branch Manager Rich Menu Configuration (Multi-page)
     * 
     * Layout:
     * [แดชบอร์ด]  [KPI]        [NPL]
     * [อนุมัติ]    [ผลงานทีม]   [เมนู]
     */
    private getBranchManagerRichMenuConfig(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686,
            },
            selected: true,
            name: 'Branch Manager Menu',
            chatBarText: 'เมนูผู้จัดการ',
            areas: [
                // Row 1: แดชบอร์ด (DASHBOARD)
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'แดชบอร์ด',
                        text: 'แดชบอร์ด',
                    },
                },
                // Row 1: KPI
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'KPI',
                        text: 'KPI',
                    },
                },
                // Row 1: NPL
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'NPL',
                        text: 'NPL',
                    },
                },
                // Row 2: อนุมัติ (APPROVE)
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'อนุมัติ',
                        text: 'อนุมัติ',
                    },
                },
                // Row 2: ผลงานทีม (PERFORMANCE)
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ผลงานทีม',
                        text: 'ผลงานทีม',
                    },
                },
                // Row 2: เมนู (MENU)
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'เมนู',
                        text: 'เมนู',
                    },
                },
            ],
        };
    }

    /**
     * Task 4.1.5: Admin Rich Menu Configuration (Multi-page)
     * 
     * Layout:
     * [แดชบอร์ด]   [สถานะระบบ] [ตั้งค่า]
     * [จัดการผู้ใช้] [รายชื่อติดต่อ] [เมนู]
     */
    private getAdminRichMenuConfig(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686,
            },
            selected: true,
            name: 'Admin Menu',
            chatBarText: 'เมนูแอดมิน',
            areas: [
                // Row 1: แดชบอร์ด (DASHBOARD)
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'แดชบอร์ด',
                        text: 'แดชบอร์ด',
                    },
                },
                // Row 1: สถานะระบบ (SYSTEM STATUS)
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'สถานะระบบ',
                        text: 'สถานะระบบ',
                    },
                },
                // Row 1: ตั้งค่า (SETTING)
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'ตั้งค่า',
                        text: 'ตั้งค่า',
                    },
                },
                // Row 2: จัดการผู้ใช้ (MANAGE USERS)
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'จัดการผู้ใช้',
                        text: 'จัดการผู้ใช้',
                    },
                },
                // Row 2: รายชื่อติดต่อ (CONTACTS)
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: {
                        type: 'message',
                        label: 'รายชื่อติดต่อ',
                        text: 'รายชื่อติดต่อ',
                    },
                },
                // Row 2: เมนู (MENU)
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: {
                        type: 'message',
                        label: 'เมนู',
                        text: 'เมนู',
                    },
                },
            ],
        };
    }

    /**
     * Task 4.1.6: Initialize all Rich Menus on startup
     * Creates Rich Menus for all roles and stores IDs in SystemConfig
     */
    async initializeRichMenus(): Promise<void> {
        try {
            console.log('🎨 Initializing Rich Menus...');

            const roles = [
                { role: 'CUSTOMER', config: this.getCustomerRichMenuConfig() },
                { role: 'USER', config: this.getCustomerRichMenuConfig() },
                { role: 'OFFICER', config: this.getLoanOfficerRichMenuConfig() },
                { role: 'MANAGER', config: this.getBranchManagerRichMenuConfig() },
                { role: 'ADMIN', config: this.getAdminRichMenuConfig() },
            ];

            for (const { role, config } of roles) {
                // Check if we already have an existing rich menu for this role
                const existingMenuId = await this.getRichMenuId(role);
                if (existingMenuId) {
                    try {
                        // Delete old Rich Menu from LINE API
                        await axios.delete(
                            `${LINE_MESSAGING_API}/richmenu/${existingMenuId}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${this.accessToken}`,
                                },
                            }
                        );
                        console.log(`🗑️  Deleted old Rich Menu for ${role}: ${existingMenuId}`);
                    } catch (error: any) {
                        // Ignore 404 errors (menu already deleted)
                        if (error.response?.status !== 404) {
                            console.log(`⚠️  Failed to delete old Rich Menu for ${role}: ${error.response?.data?.message || error.message}`);
                        }
                    }
                }

                const richMenuId = await this.createRichMenuWithRetry(config);

                if (richMenuId) {
                    // Task 4.1.9: Store Rich Menu ID in SystemConfig
                    await this.storeRichMenuId(role, richMenuId);
                    console.log(`✅ Rich Menu created for ${role}: ${richMenuId}`);
                } else {
                    console.error(`❌ Failed to create Rich Menu for ${role}`);
                }
            }

            console.log('✅ Rich Menu initialization complete');
        } catch (error) {
            console.error('❌ Error initializing Rich Menus:', error);
            throw error;
        }
    }

    /**
     * Task 4.1.10: Create Rich Menu with retry logic (3 attempts with exponential backoff)
     */
    private async createRichMenuWithRetry(config: RichMenuConfig): Promise<string | null> {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const response = await axios.post(
                    `${LINE_MESSAGING_API}/richmenu`,
                    config,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                return response.data.richMenuId;
            } catch (error: any) {
                const errorData = error.response?.data || {};
                console.error(`Attempt ${attempt}/${this.MAX_RETRIES} failed:`, errorData.message || error.message);

                // If we hit the limit (1000), try to delete all rich menus to clear space
                // ONLY if this is the first attempt and we are in development
                if (errorData.message?.includes('max #of richmenu') && attempt === 1 && env.isDevelopment) {
                    console.warn('⚠️ LINE Rich Menu limit reached (1000). Attempting to clear space...');
                    await this.deleteAllRichMenus();
                    // After deleting, the next retry should succeed
                }

                if (attempt < this.MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        return null;
    }

    /**
     * Task 4.1.9: Store Rich Menu ID in SystemConfig table
     */
    private async storeRichMenuId(role: string, richMenuId: string): Promise<void> {
        const key = `rich_menu_${role.toLowerCase()}`;
        
        // Use existing system config's createdBy if available, otherwise use a placeholder
        const existingConfig = await prisma.systemConfig.findFirst({
            where: { category: 'LINE' }
        });
        
        const createdBy = existingConfig?.createdBy || '00000000-0000-0000-0000-000000000000';

        await prisma.systemConfig.upsert({
            where: { key },
            update: {
                value: richMenuId,
                updatedAt: new Date(),
                updatedBy: createdBy,
            },
            create: {
                key,
                value: richMenuId,
                category: 'LINE',
                description: `Rich Menu ID for ${role} role`,
                dataType: 'STRING',
                createdBy: createdBy,
            },
        });
    }

    /**
     * Get Rich Menu ID from SystemConfig
     */
    private async getRichMenuId(role: string): Promise<string | null> {
        const key = `rich_menu_${role.toLowerCase()}`;

        const config = await prisma.systemConfig.findUnique({
            where: { key },
        });

        return config?.value || null;
    }

    /**
     * Task 4.1.7: Assign Rich Menu based on user role
     * 
     * @param lineUserId - LINE User ID
     * @param role - User role (USER, OFFICER, MANAGER, ADMIN)
     */
    async assignRichMenu(lineUserId: string, role: string): Promise<boolean> {
        try {
            const normalizedRole = this.normalizeRoleForRichMenu(role);
            let richMenuId = await this.getRichMenuId(normalizedRole);
            let menuRoleForImage = normalizedRole;

            if (!richMenuId) {
                console.error(`Rich Menu ID not found for role: ${normalizedRole}`);
                // Only allow fallback between CUSTOMER <-> USER
                if (normalizedRole === 'CUSTOMER' || normalizedRole === 'USER') {
                    richMenuId = await this.getRichMenuId(normalizedRole === 'CUSTOMER' ? 'USER' : 'CUSTOMER');
                    if (richMenuId) {
                        menuRoleForImage = normalizedRole === 'CUSTOMER' ? 'USER' : 'CUSTOMER';
                    }
                }
                if (!richMenuId) {
                    return false;
                }
            }

            // Task 4.1.13: Verify Rich Menu exists before assignment
            const exists = await this.verifyRichMenuExists(richMenuId);
            if (!exists) {
                console.error(`Rich Menu ${richMenuId} does not exist`);
                return false;
            }

            try {
                await axios.post(
                    `${LINE_MESSAGING_API}/user/${lineUserId}/richmenu/${richMenuId}`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                        },
                    }
                );
            } catch (error: any) {
                const message = error.response?.data?.message || error.message;
                if (typeof message === 'string' && message.includes('must upload richmenu image')) {
                    const imageBuffer = this.tryReadRoleRichMenuImage(menuRoleForImage) ?? this.createSimpleRichMenuImage(menuRoleForImage);
                    const uploaded = await this.uploadRichMenuImage(richMenuId, imageBuffer, 'image/png');
                    if (!uploaded) {
                        throw error;
                    }

                    await axios.post(
                        `${LINE_MESSAGING_API}/user/${lineUserId}/richmenu/${richMenuId}`,
                        {},
                        {
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                            },
                        }
                    );
                } else {
                    throw error;
                }
            }

            console.log(`✅ Rich Menu assigned to ${lineUserId} (${normalizedRole})`);
            return true;
        } catch (error: any) {
            console.error('Error assigning Rich Menu:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Task 4.1.8: Update user Rich Menu when role changes
     * 
     * @param lineUserId - LINE User ID
     * @param newRole - New user role
     */
    async updateUserRichMenu(lineUserId: string, newRole: string): Promise<boolean> {
        try {
            // Unlink current Rich Menu first
            await this.unlinkRichMenu(lineUserId);

            // Assign new Rich Menu
            return await this.assignRichMenu(lineUserId, newRole);
        } catch (error: any) {
            console.error('Error updating Rich Menu:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Unlink Rich Menu from user
     */
    private async unlinkRichMenu(lineUserId: string): Promise<void> {
        try {
            await axios.delete(
                `${LINE_MESSAGING_API}/user/${lineUserId}/richmenu`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }
            );
        } catch (error: any) {
            // Ignore 404 errors (no Rich Menu linked)
            if (error.response?.status !== 404) {
                throw error;
            }
        }
    }

    /**
     * Task 4.1.13: Verify Rich Menu exists
     */
    private async verifyRichMenuExists(richMenuId: string): Promise<boolean> {
        try {
            await axios.get(
                `${LINE_MESSAGING_API}/richmenu/${richMenuId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Task 4.1.12: Upload Rich Menu image
     * 
     * @param richMenuId - Rich Menu ID to upload image for
     * @param imageBuffer - Image buffer (PNG or JPEG, 2500x1686px or 2500x843px)
     * @param contentType - Image content type (image/png or image/jpeg)
     */
    async uploadRichMenuImage(
        richMenuId: string,
        imageBuffer: Buffer,
        contentType: 'image/png' | 'image/jpeg' = 'image/png'
    ): Promise<boolean> {
        try {
            await axios.post(
                `${LINE_DATA_API}/richmenu/${richMenuId}/content`,
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': contentType,
                    },
                }
            );

            console.log(`✅ Rich Menu image uploaded for ${richMenuId}`);
            return true;
        } catch (error: any) {
            console.error('Error uploading Rich Menu image:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Upload Rich Menu image from file path
     * 
     * @param richMenuId - Rich Menu ID to upload image for
     * @param imagePath - Path to image file
     */
    async uploadRichMenuImageFromFile(richMenuId: string, imagePath: string): Promise<boolean> {
        try {
            const fs = await import('fs');
            const path = await import('path');

            const imageBuffer = fs.readFileSync(imagePath);
            const ext = path.extname(imagePath).toLowerCase();
            const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

            return await this.uploadRichMenuImage(richMenuId, imageBuffer, contentType);
        } catch (error: any) {
            console.error('Error uploading Rich Menu image from file:', error.message);
            return false;
        }
    }

    /**
     * Sleep utility for retry logic
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Delete all Rich Menus (for cleanup/reset)
     */
    async deleteAllRichMenus(): Promise<void> {
        try {
            const response = await axios.get(
                `${LINE_MESSAGING_API}/richmenu/list`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }
            );

            const richMenus = response.data.richmenus || [];

            for (const menu of richMenus) {
                await axios.delete(
                    `${LINE_MESSAGING_API}/richmenu/${menu.richMenuId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                        },
                    }
                );
                console.log(`Deleted Rich Menu: ${menu.richMenuId}`);
            }

            console.log('✅ All Rich Menus deleted');
        } catch (error: any) {
            console.error('Error deleting Rich Menus:', error.response?.data || error.message);
        }
    }
}
