import axios from 'axios';
import { env } from '@config/env.config';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

const richMenuConfig = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Loan Management Menu',
    chatBarText: '📋 เมนู',
    areas: [
        { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'postback', data: 'action=balance', displayText: 'ดูยอดคงเหลือ' } },
        { bounds: { x: 833, y: 0, width: 833, height: 843 }, action: { type: 'postback', data: 'action=next_due', displayText: 'กำหนดชำระ' } },
        { bounds: { x: 1666, y: 0, width: 834, height: 843 }, action: { type: 'postback', data: 'action=history', displayText: 'ประวัติการชำระ' } },
        { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'postback', data: 'action=contact', displayText: 'ติดต่อเจ้าหน้าที่' } },
        { bounds: { x: 833, y: 843, width: 833, height: 843 }, action: { type: 'postback', data: 'action=notifications', displayText: 'การแจ้งเตือน' } },
        { bounds: { x: 1666, y: 843, width: 834, height: 843 }, action: { type: 'postback', data: 'action=register', displayText: 'ลงทะเบียน' } },
    ],
};

export class LineRichMenuService {
    private accessToken: string;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
    }

    async handleAction(action: string, richMenuId?: string, imageUrl?: string) {
        switch (action) {
            case 'create':
                return await this.createRichMenu();
            case 'list':
                return await this.listRichMenus();
            case 'set-default':
                if (!richMenuId) throw new Error('richMenuId required');
                return await this.setDefaultRichMenu(richMenuId);
            case 'upload-image':
                if (!richMenuId || !imageUrl) throw new Error('richMenuId and imageUrl required');
                return await this.uploadRichMenuImage(richMenuId, imageUrl);
            case 'delete':
                if (!richMenuId) throw new Error('richMenuId required');
                return await this.deleteRichMenu(richMenuId);
            default:
                throw new Error('Invalid action. Valid: create, list, set-default, upload-image, delete');
        }
    }

    private async createRichMenu() {
        try {
            const response = await axios.post(
                `${LINE_MESSAGING_API}/richmenu`,
                richMenuConfig,
                { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
            );
            return { richMenuId: response.data.richMenuId };
        } catch (error: any) {
            return { error: 'ไม่สามารถสร้าง Rich Menu ได้' };
        }
    }

    private async listRichMenus() {
        try {
            const response = await axios.get(`${LINE_MESSAGING_API}/richmenu/list`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
            });
            return { richmenus: response.data.richmenus || [] };
        } catch (error: any) {
            return { richmenus: [], error: 'ไม่สามารถโหลดรายการ Rich Menu ได้' };
        }
    }

    private async setDefaultRichMenu(richMenuId: string) {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/user/all/richmenu/${richMenuId}`,
                {},
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );
            return { success: true };
        } catch (error: any) {
            return { success: false, error: 'ไม่สามารถตั้งค่า Rich Menu เริ่มต้นได้' };
        }
    }

    private async uploadRichMenuImage(richMenuId: string, imageUrl: string) {
        try {
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            await axios.post(
                `${LINE_MESSAGING_API}/richmenu/${richMenuId}/content`,
                imageResponse.data,
                { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'image/png' } }
            );
            return { success: true };
        } catch (error: any) {
            return { success: false, error: 'ไม่สามารถอัปโหลดรูปภาพ Rich Menu ได้' };
        }
    }

    private async deleteRichMenu(richMenuId: string) {
        try {
            await axios.delete(`${LINE_MESSAGING_API}/richmenu/${richMenuId}`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: 'ไม่สามารถลบ Rich Menu ได้' };
        }
    }
}
