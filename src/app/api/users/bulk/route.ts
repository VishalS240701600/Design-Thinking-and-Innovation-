import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, hashPassword } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface ParsedCustomer {
    name: string;
    address: string;
    phone: string;
    email: string;
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const agencyId = formData.get('agencyId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        if (!agencyId) {
            return NextResponse.json({ error: 'Agency selection is required' }, { status: 400 });
        }

        const parsedAgencyId = parseInt(agencyId);

        // Read the Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays (raw rows)
        const rawRows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const customers: ParsedCustomer[] = [];
        let skippedRows = 0;
        let headerRowIndex = -1;

        // Find the header row by looking for "name" or "address" or "mobile" in columns
        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i];
            if (!row) continue;
            
            const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
            if (rowStr.includes('name') || rowStr.includes('mobile') || rowStr.includes('address')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;

        const headerRow = rawRows[headerRowIndex] || [];
        let colName = 0;
        let colAddress = 1;
        let colMobile = 3;
        let colTelephone = 4;
        let colEmail = 5;

        for (let c = 0; c < headerRow.length; c++) {
            const h = String(headerRow[c] || '').toLowerCase().trim();
            if (h.includes('name')) colName = c;
            else if (h.includes('address')) colAddress = c;
            else if (h.includes('mobile')) colMobile = c;
            else if (h.includes('telephone')) colTelephone = c;
            else if (h.includes('email')) colEmail = c;
        }

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const name = String(row[colName] || '').trim();
            // If there's no name, it might be an empty row
            if (!name) continue;

            // Check if it's a category separator like "CUSTOMERS" or "SUNDRY DEBTORS"
            // Category headers usually don't have an address or phone in this format
            const address = String(row[colAddress] || '').trim();
            const mobile = String(row[colMobile] || '').trim();
            const telephone = String(row[colTelephone] || '').trim();
            const email = String(row[colEmail] || '').trim();

            if (!address && !mobile && !telephone && !email) {
                // Probably a category header
                continue;
            }

            const phone = mobile || telephone || '';
            const finalEmail = email || `customer_${Date.now()}_${Math.floor(Math.random() * 10000)}@dummy.fmcg.com`;

            customers.push({
                name,
                address,
                phone,
                email: finalEmail
            });
        }

        if (customers.length === 0) {
            return NextResponse.json({
                error: 'No valid customers found in the file. Ensure columns like Name, Address, Mobile exist.',
                skippedRows
            }, { status: 400 });
        }

        // Bulk create customers
        const defaultPassword = await hashPassword('password123'); // Give them a default generic password

        const created = await prisma.user.createMany({
            data: customers.map((c) => ({
                agencyId: parsedAgencyId,
                role: 'CUSTOMER',
                name: c.name,
                email: c.email,
                phone: c.phone || null,
                address: c.address || null,
                password: defaultPassword,
            })),
            skipDuplicates: true, // If by any chance an email is duplicate within agency
        });

        return NextResponse.json({
            success: true,
            imported: created.count,
            total: customers.length,
            skippedRows
        });

    } catch (err) {
        console.error('Bulk upload error:', err);
        return NextResponse.json({ error: 'Failed to process file. Please check the format.' }, { status: 500 });
    }
}
