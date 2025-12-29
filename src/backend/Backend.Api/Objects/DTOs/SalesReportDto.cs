namespace Backend.Api.Objects.DTOs;

public class SalesReportDto
{
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public DocumentTypeStats Receipts { get; set; } = new();
    public DocumentTypeStats InvoicesPersonal { get; set; } = new();
    public DocumentTypeStats InvoicesCompany { get; set; } = new();
    public DocumentTypeStats Total { get; set; } = new();
    public List<TaxBreakdownDto> TaxBreakdown { get; set; } = new();
    public List<ProductDetailDto>? ProductDetails { get; set; }
    public string GeneratedBy { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}

public class DocumentTypeStats
{
    public int Count { get; set; }
    public decimal TotalGross { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalNet { get; set; }
}

public class TaxBreakdownDto
{
    public string TaxCode { get; set; } = string.Empty;
    public decimal TaxRate { get; set; }
    public int TotalProducts { get; set; }
    public int DistinctProducts { get; set; }
    public decimal TaxReceipts { get; set; }
    public decimal TaxInvoicesPersonal { get; set; }
    public decimal TaxInvoicesCompany { get; set; }
    public decimal TaxTotal { get; set; }
}

public class ProductDetailDto
{
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string Locations { get; set; } = string.Empty;
    public int AmountSold { get; set; }
    public decimal NetAmount { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrossAmount { get; set; }
}
