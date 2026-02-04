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
        // List of placeholder/dummy numbers/names that should NOT trigger a merge
        const DUMMY_PHONES = ["0", "00", "000", "0000", "00000", "000000", "0000000", "00000000", "000000000", "0000000000", "1111111111", "SIN TELEFONO", "SIN PROVEEDOR"];
        const normalizedPhone = data.phone.replace(/[\s-]/g, '');
        const isDummy = DUMMY_PHONES.includes(normalizedPhone) || normalizedPhone.length < 5;

        // 1. If it's a REAL phone, try to find existing customer
        if (!isDummy) {
            let customer = await db.customer.findFirst({
                where: {
                    phone: data.phone,
                }
            });

            if (customer) {
                let needsUpdate = false;
                if (customer.name !== data.name) needsUpdate = true;
                if (data.email && customer.email !== data.email) needsUpdate = true;

                if (needsUpdate) {
                    customer = await db.customer.update({
                        where: { id: customer.id },
                        data: {
                            name: data.name,
                            email: data.email ?? customer.email
                        }
                    });
                }
                return customer;
            }
        }

        // 2. Prepare Phone for creation (Force Unique if Dummy)
        let finalPhone = data.phone;
        if (isDummy) {
            // Append random suffix to satisfy Unique Constraint
            // Format: 0000000000_1701234567890
            finalPhone = `${data.phone}_${Date.now()}${Math.floor(Math.random() * 100)}`;
        }

        // 3. Create new
        return await db.customer.create({
            data: {
                name: data.name,
                phone: finalPhone,
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
