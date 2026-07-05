import bcrypt from "bcrypt";
import { prisma, UserRole, type User } from "@jobscheduler/db";
import { conflict, unauthorized } from "../../lib/errors";
import { signToken } from "../../lib/jwt";
import { slugify } from "../../lib/slug";
import type { LoginInput, RegisterInput } from "./auth.schemas";

const SALT_ROUNDS = 10;

async function generateUniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

function sanitizeUser(user: User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const slug = await generateUniqueOrgSlug(input.orgName);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.orgName, slug },
    });
    const user = await tx.user.create({
      data: {
        orgId: organization.id,
        email: input.email,
        passwordHash,
        name: input.name,
        role: UserRole.ADMIN,
      },
    });
    return { user, organization };
  });

  const token = signToken({ userId: user.id, orgId: organization.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw unauthorized("Invalid email or password");

  const token = signToken({ userId: user.id, orgId: user.orgId, role: user.role });
  return { token, user: sanitizeUser(user) };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? sanitizeUser(user) : null;
}
