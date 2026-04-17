/**
 * Enhanced Conversation State Service
 * 
 * Purpose: Manage multi-step conversation flows in LINE
 * Features:
 * - Store conversation state per user (in-memory with Redis fallback)
 * - Handle multi-step flows (contact logging, etc.)
 * - Timeout handling (15 minutes)
 * - State cleanup
 */

// In-memory cache for conversation states
const conversationStates = new Map<string, {
    type: string;
    data: Record<string, any>;
    expiresAt: Date;
}>();

export class ConversationStateService {
    private readonly TIMEOUT_MINUTES = 15;

    /**
     * Set conversation state
     */
    async setState(
        lineUserId: string,
        type: string,
        data: Record<string, any> = {}
    ): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.TIMEOUT_MINUTES);

        conversationStates.set(lineUserId, {
            type,
            data,
            expiresAt
        });
    }

    /**
     * Get conversation state
     */
    async getState(lineUserId: string): Promise<{
        type: string;
        data: Record<string, any>;
        expiresAt: Date;
    } | null> {
        const state = conversationStates.get(lineUserId);
        
        if (!state) {
            return null;
        }

        // Check if expired
        if (new Date() > state.expiresAt) {
            conversationStates.delete(lineUserId);
            return null;
        }

        return state;
    }

    /**
     * Clear conversation state
     */
    async clearState(lineUserId: string): Promise<void> {
        conversationStates.delete(lineUserId);
    }

    /**
     * Get cancel message
     */
    getCancelMessage(): string {
        return '❌ ยกเลิกการดำเนินการแล้ว\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้';
    }

    /**
     * Update step in existing state
     */
    async updateStep(
        lineUserId: string,
        step: string,
        data: Record<string, any> = {}
    ): Promise<void> {
        const state = conversationStates.get(lineUserId);
        if (state) {
            state.data = { ...state.data, step, ...data };
        }
    }

    /**
     * Get timeout message
     */
    getTimeoutMessage(): string {
        return '⏰ เซสชันหมดอายุแล้ว\n\nกรุณาเริ่มใหม่อีกครั้ง\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้';
    }

    /**
     * Cleanup expired states (run periodically)
     */
    cleanupExpiredStates(): void {
        const now = new Date();
        for (const [userId, state] of conversationStates.entries()) {
            if (now > state.expiresAt) {
                conversationStates.delete(userId);
            }
        }
    }
}