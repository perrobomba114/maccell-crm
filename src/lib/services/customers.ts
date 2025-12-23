import { db } from "@/lib/db";

interface CreateCustomerData {
    name: string;
    phone: string;
    email?: string | null;
    branchId: string;
    userId: string;
    isFinalConsumer?: boolean;
}

export class CustomerService {
    async findOrCreate(data: CreateCustomerData) {
        // 1. Try to find by phone (Unique identifier logic)
        // Note: Schema says @@unique([phone, branchId]) but user SQL said phone unique globally.
        // We will search by phone globally first to avoid creating duplicates across branches if not desired, 
        // OR strict branch scope. 
        // Given 'Maccell 1' 'Maccell 2', customers might go to both.
        // If schema is scoped to branch, we search by phone AND branchId.

        let customer = await db.customer.findFirst({
            where: {
                phone: data.phone,
                // branchId: data.branchId // Do we scope? If checked globally, we reuse. If scoped, we create new for this branch.
                // Let's scope to branch as per schema unique constraint usually implying separation.
            }
        });

        // 2. If valid global customer exists maybe reuse? 
        // Implementation Plan said: "Find by Phone or Create".
        // Let's strictly follow the schema constraint: unique per branch+phone.
        // But wait, if I visit Branch 1 then Branch 2, do I get a new Customer record?
        // Usually yes in simple multi-tenant.

        if (customer) {
            // Check if updates needed
            let needsUpdate = false;
            if (customer.name !== data.name) {
                // Update name if changed
                needsUpdate = true;
            }
            if (data.email && customer.email !== data.email) {
                needsUpdate = true;
            }

            if (needsUpdate) {
                customer = await db.customer.update({
                    where: { id: customer.id },
                    data: {
                        name: data.name,
                        email: data.email ?? customer.email // Don't wipe email if not provided? Or update?
                    }
                });
            }
            return customer;
        }

        // 3. Create new
        return await db.customer.create({
            data: {
                name: data.name,
                phone: data.phone,
                email: data.email,
                branchId: data.branchId,
                userId: data.userId,
                isFinalConsumer: data.isFinalConsumer ?? false
            }
        });
    }

    async searchByPhone(phone: string) {
        return await db.customer.findFirst({
            where: { phone: { contains: phone } }
        });
    }
}

export const customerService = new CustomerService();
