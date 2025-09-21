import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
        id: string;
        createdAt: Date;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        updatedAt: Date;
    }>;
    changePassword(userId: string, userRole: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}
