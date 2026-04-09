import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface ParsedProduct {
    name: string;
    unit: string;
    stock: number;
    price: number;
    category: string;
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

        // Read the Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays (raw rows)
        const rawRows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Parse the Excel format:
        // Row 0: Title row "OPENING STOCK STATEMENT..."
        // Row 1: Header row: Particulars, Unit, MRP Sl.No, Stock, Free, Cost Rs., Value
        // Data rows: category headers (bold, no stock/price) and product rows
        //
        // Category rows: only have text in the first column, no numeric values in Stock/Cost columns
        // Product rows: have Particulars, Unit, Stock, Cost Rs.

        const products: ParsedProduct[] = [];
        let currentCategory = '';
        let skippedRows = 0;
        let headerRowIndex = -1;

        // Find the header row by looking for "Particulars" or "Stock"
        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i];
            if (!row) continue;
            const firstCell = String(row[0] || '').toLowerCase().trim();
            if (firstCell.includes('particular')) {
                headerRowIndex = i;
                break;
            }
        }

        // If no header found, assume row 1 is header (row 0 is title)
        if (headerRowIndex === -1) headerRowIndex = 1;

        // Determine column indices from header row
        const headerRow = rawRows[headerRowIndex] || [];
        let colParticulars = 0;
        let colUnit = 1;
        let colStock = -1;
        let colCost = -1;

        for (let c = 0; c < headerRow.length; c++) {
            const h = String(headerRow[c] || '').toLowerCase().trim();
            if (h.includes('particular')) colParticulars = c;
            else if (h === 'unit') colUnit = c;
            else if (h === 'stock') colStock = c;
            else if (h.includes('cost')) colCost = c;
        }

        // Fallback: if Stock/Cost columns weren't found by name, use positional defaults
        if (colStock === -1) colStock = 3; // 4th column
        if (colCost === -1) colCost = 5;   // 6th column

        // Process data rows (after header)
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const name = String(row[colParticulars] || '').trim();
            if (!name) continue;

            const unit = String(row[colUnit] || '').trim();
            const stockVal = row[colStock];
            const costVal = row[colCost];

            // Determine if this is a category header or a product row
            // Category rows: typically have a name but NO stock and NO cost values
            const hasStock = stockVal !== undefined && stockVal !== null && stockVal !== '' && !isNaN(Number(stockVal));
            const hasCost = costVal !== undefined && costVal !== null && costVal !== '' && !isNaN(Number(costVal));

            if (!hasStock && !hasCost) {
                // This is a category header row
                currentCategory = name;
                continue;
            }

            // This is a product row
            const stock = hasStock ? Math.round(Number(stockVal)) : 0;
            const price = hasCost ? Number(Number(costVal).toFixed(2)) : 0;

            if (price <= 0) {
                skippedRows++;
                continue;
            }

            products.push({
                name,
                unit: unit || 'pcs',
                stock,
                price,
                category: currentCategory || 'Uncategorized',
            });
        }

        if (products.length === 0) {
            return NextResponse.json({
                error: 'No valid products found in the file. Make sure the Excel has columns: Particulars, Unit, Stock, Cost Rs.',
                skippedRows
            }, { status: 400 });
        }

        // Bulk create products in database
        const parsedAgencyId = parseInt(agencyId);
        const created = await prisma.product.createMany({
            data: products.map(p => ({
                agencyId: parsedAgencyId,
                name: p.name,
                price: p.price,
                stock: p.stock,
                unit: p.unit,
                category: p.category,
            })),
            skipDuplicates: true,
        });

        return NextResponse.json({
            success: true,
            imported: created.count,
            total: products.length,
            skippedRows,
            categories: [...new Set(products.map(p => p.category))],
        });

    } catch (err) {
        console.error('Bulk upload error:', err);
        return NextResponse.json({ error: 'Failed to process file. Please check the format.' }, { status: 500 });
    }
}
