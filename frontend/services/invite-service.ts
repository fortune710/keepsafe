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

    static async createInvite(inviterId: string, inviteCode: string): Promise<void> {
        const invite = await supabase.from(TABLES.INVITES).upsert({
            inviter_id: inviterId,
            invite_code: inviteCode,
            max_uses: this.MAX_INVITE_USES,
        } as never, { onConflict: 'inviter_id' });

        if (invite.error) {
            throw new Error(invite.error.message);
        }
    }

    static async getInvite(userId: string): Promise<Invite> {
        const { data: invite, error } = await supabase
            .from(TABLES.INVITES)
            .select('*')
            .eq('inviter_id', userId)
            .maybeSingle();
        if (error) {
            throw new Error(error.message);
        }

        if (!invite) {
            throw new Error('Invite not found');
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