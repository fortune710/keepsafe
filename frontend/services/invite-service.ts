import { TABLES } from "@/constants/supabase";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type Invite = Database['public']['Tables']['invites']['Row'];

export class InviteService {
    static readonly MAX_INVITE_USES = 10;
    static generateInviteCode(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    static async createInvite(inviterId: string, inviteCode: string): Promise<void> {
        const invite = await supabase.from(TABLES.INVITES).upsert({
            inviter_id: inviterId,
            invite_code: inviteCode,
            max_uses: this.MAX_INVITE_USES,
        } as never, { onConflict: 'invite_code' });

        if (invite.error) {
            throw new Error(invite.error.message);
        }
    }

    static async getInvite(userId: string): Promise<Invite> {
        const { data: invite, error } = await supabase
            .from(TABLES.INVITES)
            .select('*')
            .eq('inviter_id', userId)
            .single();
        if (error) {
            throw new Error(error.message);
        }
        return invite;
    }

    static async updateInvite(inviteCode: string, updates: Partial<Invite>): Promise<void> {
        const { error } = await supabase
        .from(TABLES.INVITES)
        .update(updates as never)
        .eq('invite_code', inviteCode);
        if (error) {
            throw new Error(error.message);
        }
    }
}