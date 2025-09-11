import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminLogin = process.env.ADMIN_LOGIN || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator';

  const existingAdmin = await prisma.user.findUnique({
    where: { login: adminLogin }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        login: adminLogin,
        password: hashedPassword,
        displayName: adminDisplayName,
        role: Role.ADMIN,
        isBlocked: false
      }
    });

    console.log('Admin user created:', admin.login);
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });