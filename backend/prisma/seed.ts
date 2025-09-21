import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminLogin = process.env.ADMIN_LOGIN || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { login: adminLogin },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        login: adminLogin,
        password: hashedPassword,
        displayName: 'Administrator',
        role: Role.ADMIN,
        isBlocked: false,
      },
    });

    console.log('Admin user created:', {
      login: admin.login,
      displayName: admin.displayName,
      role: admin.role,
    });
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });