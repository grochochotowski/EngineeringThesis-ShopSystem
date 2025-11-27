/**
 * Sales Document Types Dictionary
 * Enum mapping from backend SalesDocumentType enum
 */

export const salesDocumentTypesData = [
    {
        id: 0,
        value: "Unspecified",
        description: "Undefined document type"
    },
    {
        id: 1,
        value: "Receipt",
        description: "Sales receipt for cash transactions"
    },
    {
        id: 2,
        value: "InvoicePersonal",
        description: "Invoice issued to individual customer"
    },
    {
        id: 3,
        value: "InvoiceCompany",
        description: "Invoice issued to business entity"
    },
];
