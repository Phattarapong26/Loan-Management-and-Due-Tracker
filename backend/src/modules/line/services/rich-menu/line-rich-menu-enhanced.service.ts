/**
 * Enhanced LINE Rich Menu Service
 * ระบบ Rich Menu ภาพแทนการพิมพ์สำหรับทุก Role
 */

import axios from 'axios';
import { env } from '@config/env.config';
import { prisma } from '@config/database.config';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

interface RichMenuArea {
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    action: {
        type: 'postback' | 'message' | 'uri';
        data?: string;
        text?: string;
        uri?: string;
    };
}

interface RichMenuConfig {
    size: {
        width: number;
        height: number;
    };
    selected: boolean;
    name: string;
    chatBarText: string;
    areas: RichMenuArea[];
}

export class LineRichMenuEnhancedService {
    private accessToken: string;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
    }

    /**
     * Create role-based rich menu
     */
    async createRoleBasedRichMenu(role: string): Promise<string | null> {
        try {
            // Check if we already have a valid rich menu for this role
            const existingMenuId = await this.getRichMenuIdForRole(role);
            if (existingMenuId) {
                const isValid = await this.verifyRichMenuExists(existingMenuId);
                if (isValid) {
                    console.log(`ℹ️ Using existing Rich Menu for ${role}: ${existingMenuId}`);
                    return existingMenuId;
                }
                console.log(`⚠️ Existing Rich Menu for ${role} is invalid, creating new one...`);
            }

            const menuConfig = this.getRichMenuConfig(role);
            if (!menuConfig) {
                console.log(`No rich menu config for role: ${role}`);
                return null;
            }

            // Create rich menu
            try {
                const response = await axios.post(
                    `${LINE_MESSAGING_API}/richmenu`,
                    menuConfig,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const richMenuId = response.data.richMenuId;
                console.log(`Created rich menu for ${role}: ${richMenuId}`);

                // Create a simple colored image for the rich menu
                const imageBuffer = await this.createSimpleRichMenuImage(role);
                const imageUploaded = await this.uploadRichMenuImage(richMenuId, role, imageBuffer);

                if (imageUploaded) {
                    console.log(`✅ Uploaded image for ${role} rich menu`);
                } else {
                    console.log(`⚠️  Failed to upload image for ${role} rich menu, but menu created`);
                }

                return richMenuId;
            } catch (createError: any) {
                const errorData = createError.response?.data || {};
                if (errorData.message?.includes('max #of richmenu') && env.isDevelopment) {
                    console.warn('⚠️ LINE Rich Menu limit reached (1000). Attempting to clear space...');
                    await this.deleteAllRichMenus();
                    // One retry after deletion
                    return await this.createRoleBasedRichMenu(role);
                }
                throw createError;
            }
        } catch (error) {
            console.error('Error creating rich menu:', error);
            return null;
        }
    }

    /**
     * Verify Rich Menu exists on LINE
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
     * Delete all Rich Menus from LINE
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
            console.log(`Found ${richMenus.length} rich menus to delete`);

            for (const menu of richMenus) {
                await axios.delete(
                    `${LINE_MESSAGING_API}/richmenu/${menu.richMenuId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                        },
                    }
                );
            }
            console.log('✅ All Rich Menus deleted from LINE');
        } catch (error: any) {
            console.error('Error deleting all rich menus:', error.response?.data || error.message);
        }
    }

    /**
     * Get rich menu configuration for each role
     */
    private getRichMenuConfig(role: string): RichMenuConfig | null {
        switch (role) {
            case 'USER':
                return this.getCustomerRichMenu();
            case 'OFFICER':
                return this.getOfficerRichMenu();
            case 'MANAGER':
                return this.getManagerRichMenu();
            case 'ADMIN':
                return this.getAdminRichMenu();
            default:
                return this.getDefaultRichMenu();
        }
    }

    /**
     * Customer Rich Menu (2x3 grid - 6 เมนู)
     */
    private getCustomerRichMenu(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686 // กลับเป็น 2 แถว
            },
            selected: true,
            name: 'Customer Menu',
            chatBarText: 'เมนูลูกค้า',
            areas: [
                // Row 1 - ข้อมูลสินเชื่อ
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'ยอดคงเหลือ' }
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'message', text: 'กำหนดชำระ' }
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'ตารางชำระ' }
                },
                // Row 2 - เอกสารและบริการ
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'ประวัติ' }
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'message', text: 'ใบแจ้งหนี้' }
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'เมนู' }
                }
            ]
        };
    }

    /**
     * Officer Rich Menu (2x3 grid - 6 เมนู)
     */
    private getOfficerRichMenu(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686 // กลับเป็น 2 แถว
            },
            selected: true,
            name: 'Officer Menu',
            chatBarText: 'เมนูเจ้าหน้าที่',
            areas: [
                // Row 1 - งานประจำวัน
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'งานวันนี้' }
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'message', text: 'บันทึกการติดต่อ' }
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'dashboard' }
                },
                // Row 2 - ลูกค้าและการจัดการ
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'ลูกค้า' }
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'message', text: 'สินเชื่อ' }
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'เมนู' }
                }
            ]
        };
    }

    /**
     * Manager Rich Menu (2x3 grid - 6 เมนู)
     */
    private getManagerRichMenu(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686 // กลับเป็น 2 แถว
            },
            selected: true,
            name: 'Manager Menu',
            chatBarText: 'เมนูผู้จัดการ',
            areas: [
                // Row 1 - Dashboard และ KPI
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'dashboard' }
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'message', text: 'kpi' }
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'npl' }
                },
                // Row 2 - การอนุมัติและจัดการ
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'อนุมัติ' }
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'message', text: 'ผลงานทีม' }
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'เมนู' }
                }
            ]
        };
    }

    /**
     * Admin Rich Menu (3x2 grid - 6 เมนู)
     */
    private getAdminRichMenu(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 1686
            },
            selected: true,
            name: 'Admin Menu',
            chatBarText: 'เมนูผู้ดูแลระบบ',
            areas: [
                // Row 1 - ระบบและการจัดการ
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'dashboard' }
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'message', text: 'สถานะ' }
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'ตั้งค่า' }
                },
                // Row 2 - การติดต่อและเครื่องมือ
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'จัดการผู้ใช้' }
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'message', text: 'ติดต่อ' }
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'เมนู' }
                }
            ]
        };
    }

    /**
     * Default Rich Menu for unregistered users
     */
    private getDefaultRichMenu(): RichMenuConfig {
        return {
            size: {
                width: 2500,
                height: 843
            },
            selected: true,
            name: 'Default Menu',
            chatBarText: 'เมนูหลัก',
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 1250, height: 843 },
                    action: { type: 'message', text: 'ลงทะเบียน' }
                },
                {
                    bounds: { x: 1250, y: 0, width: 1250, height: 843 },
                    action: { type: 'message', text: 'เมนู' }
                }
            ]
        };
    }

    /**
     * Upload rich menu image
     */
    private async uploadRichMenuImage(richMenuId: string, _role: string, imageBuffer: Buffer): Promise<boolean> {
        try {
            await axios.post(
                `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'image/png'
                    }
                }
            );

            console.log(`Uploaded image for rich menu ${richMenuId}`);
            return true;
        } catch (error) {
            console.error('Error uploading rich menu image:', error);
            return false;
        }
    }

    /**
     * Create a simple Rich Menu image without canvas
     * Creates a basic PNG with solid colors and grid lines
     */
    private async createSimpleRichMenuImage(role: string): Promise<Buffer> {
        console.log(`🎨 Creating simple image for ${role} role`);

        // Get dimensions based on role
        const width = 2500;
        const height = role === 'DEFAULT' ? 843 : 1686; // 2x3 grid for all roles except DEFAULT

        // Create a simple solid color PNG
        // This creates a minimal valid PNG with the correct dimensions
        const createColoredPNG = async (w: number, h: number, color: { r: number, g: number, b: number }): Promise<Buffer> => {
            // Calculate row bytes (width * 3 bytes per pixel + 1 filter byte per row)
            const rowBytes = w * 3 + 1;
            const imageDataSize = rowBytes * h;

            // PNG signature
            const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

            // IHDR chunk
            const ihdrData = Buffer.alloc(13);
            ihdrData.writeUInt32BE(w, 0);      // width
            ihdrData.writeUInt32BE(h, 4);      // height
            ihdrData.writeUInt8(8, 8);         // bit depth
            ihdrData.writeUInt8(2, 9);         // color type (RGB)
            ihdrData.writeUInt8(0, 10);        // compression
            ihdrData.writeUInt8(0, 11);        // filter
            ihdrData.writeUInt8(0, 12);        // interlace

            const ihdrCrc = this.calculateCRC(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
            const ihdr = Buffer.concat([
                Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
                Buffer.from('IHDR'),
                ihdrData,
                ihdrCrc
            ]);

            // Create image data (simple solid color)
            const imageData = Buffer.alloc(imageDataSize);
            for (let y = 0; y < h; y++) {
                const rowStart = y * rowBytes;
                imageData[rowStart] = 0; // filter type (None)

                for (let x = 0; x < w; x++) {
                    const pixelStart = rowStart + 1 + x * 3;
                    imageData[pixelStart] = color.r;     // Red
                    imageData[pixelStart + 1] = color.g; // Green
                    imageData[pixelStart + 2] = color.b; // Blue
                }
            }

            // Compress image data (simple deflate)
            const zlib = await import('zlib');
            const compressedData = zlib.deflateSync(imageData);

            // IDAT chunk
            const idatCrc = this.calculateCRC(Buffer.concat([Buffer.from('IDAT'), compressedData]));
            const idat = Buffer.concat([
                Buffer.alloc(4), // length (will be filled)
                Buffer.from('IDAT'),
                compressedData,
                idatCrc
            ]);
            idat.writeUInt32BE(compressedData.length, 0);

            // IEND chunk
            const iendCrc = this.calculateCRC(Buffer.from('IEND'));
            const iend = Buffer.concat([
                Buffer.from([0x00, 0x00, 0x00, 0x00]), // length
                Buffer.from('IEND'),
                iendCrc
            ]);

            return Buffer.concat([signature, ihdr, idat, iend]);
        };

        // Role-based colors
        const colors = {
            USER: { r: 0, g: 170, b: 91 },      // Green for customers
            OFFICER: { r: 0, g: 102, b: 204 },   // Blue for officers
            MANAGER: { r: 255, g: 107, b: 53 },  // Orange for managers
            ADMIN: { r: 139, g: 92, b: 246 },    // Purple for admins
            DEFAULT: { r: 107, g: 114, b: 128 }  // Gray for unregistered
        };

        const roleColor = colors[role as keyof typeof colors] || colors.DEFAULT;
        return await createColoredPNG(width, height, roleColor);
    }

    /**
     * Calculate CRC32 for PNG chunks
     */
    private calculateCRC(data: Buffer): Buffer {
        const crcTable = this.makeCRCTable();
        let crc = 0xFFFFFFFF;

        for (let i = 0; i < data.length; i++) {
            const tableIndex = (crc ^ data[i]!) & 0xFF;
            const tableValue = crcTable[tableIndex];
            if (tableValue !== undefined) {
                crc = tableValue ^ (crc >>> 8);
            }
        }

        const result = Buffer.alloc(4);
        result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
        return result;
    }

    /**
     * Generate CRC table for PNG
     */
    private makeCRCTable(): number[] {
        const crcTable: number[] = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
        }
        return crcTable;
    }

    /**
     * Set rich menu for user
     */
    async setRichMenuForUser(lineUserId: string, richMenuId: string): Promise<boolean> {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/user/${lineUserId}/richmenu/${richMenuId}`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log(`Set rich menu ${richMenuId} for user ${lineUserId}`);
            return true;
        } catch (error) {
            console.error('Error setting rich menu for user:', error);
            return false;
        }
    }

    /**
     * Delete rich menu
     */
    async deleteRichMenu(richMenuId: string): Promise<boolean> {
        try {
            await axios.delete(
                `${LINE_MESSAGING_API}/richmenu/${richMenuId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log(`Deleted rich menu ${richMenuId}`);
            return true;
        } catch (error) {
            console.error('Error deleting rich menu:', error);
            return false;
        }
    }

    /**
     * Setup rich menu for user based on role
     */
    async setupRichMenuForUser(lineUserId: string, role: string): Promise<boolean> {
        try {
            // Check if we already have a rich menu for this role
            let richMenuId = await this.getRichMenuIdForRole(role);

            if (!richMenuId) {
                // Create new rich menu for this role
                richMenuId = await this.createRoleBasedRichMenu(role);
                if (!richMenuId) {
                    console.error(`Failed to create rich menu for role: ${role}`);
                    return false;
                }

                // Store rich menu ID for this role
                await this.storeRichMenuIdForRole(role, richMenuId);
            }

            // Set rich menu for user
            return await this.setRichMenuForUser(lineUserId, richMenuId);
        } catch (error) {
            console.error('Error setting up rich menu for user:', error);
            return false;
        }
    }

    /**
     * Get stored rich menu ID for role
     */
    private async getRichMenuIdForRole(role: string): Promise<string | null> {
        try {
            const config = await prisma.systemConfig.findUnique({
                where: { key: `rich_menu_${role.toLowerCase()}` }
            });
            return config?.value || null;
        } catch (error) {
            console.error('Error getting rich menu ID for role:', error);
            return null;
        }
    }

    /**
     * Store rich menu ID for role
     */
    private async storeRichMenuIdForRole(role: string, richMenuId: string): Promise<void> {
        try {
            await prisma.systemConfig.upsert({
                where: { key: `rich_menu_${role.toLowerCase()}` },
                update: { value: richMenuId },
                create: {
                    key: `rich_menu_${role.toLowerCase()}`,
                    value: richMenuId,
                    description: `Rich Menu ID for ${role} role`,
                    category: 'LINE_INTEGRATION',
                    dataType: 'STRING',
                    createdBy: 'system',
                }
            });
        } catch (error) {
            console.error('Error storing rich menu ID for role:', error);
        }
    }

    /**
     * Update user's rich menu when role changes
     */
    async updateUserRichMenu(lineUserId: string, newRole: string): Promise<boolean> {
        try {
            // Remove current rich menu
            await this.removeRichMenuFromUser(lineUserId);

            // Set new rich menu based on role
            return await this.setupRichMenuForUser(lineUserId, newRole);
        } catch (error) {
            console.error('Error updating user rich menu:', error);
            return false;
        }
    }

    /**
     * Remove rich menu from user
     */
    async removeRichMenuFromUser(lineUserId: string): Promise<boolean> {
        try {
            await axios.delete(
                `${LINE_MESSAGING_API}/user/${lineUserId}/richmenu`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log(`Removed rich menu from user ${lineUserId}`);
            return true;
        } catch (error) {
            // It's okay if there's no rich menu to remove
            console.log(`No rich menu to remove for user ${lineUserId}`);
            return true;
        }
    }

    /**
     * Initialize rich menus for all roles
     */
    async initializeAllRichMenus(): Promise<void> {
        const roles = ['USER', 'OFFICER', 'MANAGER', 'ADMIN', 'DEFAULT'];

        for (const role of roles) {
            console.log(`Initializing rich menu for role: ${role}`);

            // Re-use createRoleBasedRichMenu which now handles re-use logic
            const richMenuId = await this.createRoleBasedRichMenu(role);

            if (richMenuId) {
                await this.storeRichMenuIdForRole(role, richMenuId);
                console.log(`✅ Rich menu for ${role}: ${richMenuId}`);
            } else {
                console.error(`❌ Failed to initialize rich menu for ${role}`);
            }
        }
    }
}