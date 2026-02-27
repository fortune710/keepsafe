import { TABLES } from "@/constants/supabase";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { generateInviteCode } from "@/lib/utils";

type Invite = Database['public']['Tables']['invites']['Row'];

export class InviteService {
    static readonly MAX_INVITE_USES = 10;
    static async generateInviteCode(): Promise<string> {
        return generateInviteCode();
    }

    static async getInvite(userId: string): Promise<Invite> {
        const { data: profile, error } = await (supabase
            .from('profiles')
            .select('id, invite_code')
            .eq('id', userId)
            .single() as any);

        if (error) {
            throw new Error(error.message);
        }

        if (!profile || !profile.invite_code) {
            throw new Error('Invite code not found for user');
        }

        // Return a shape that matches the Invite type but using data from profiles
        return {
            id: profile.id,
            inviter_id: profile.id,
            invite_code: profile.invite_code,
            message: null,
            max_uses: this.MAX_INVITE_USES,
            current_uses: 0,
            is_active: true,
            created_at: new Date().toISOString(),
        } as Invite;
    }

    static async updateInvite(inviteCode: string, updates: Partial<Invite>): Promise<void> {
        const { error } = await (supabase
            .from('profiles')
            .update({ invite_code: updates.invite_code } as any)
            .eq('invite_code', inviteCode) as any);
        if (error) {
            throw new Error(error.message);
        }
    }
}