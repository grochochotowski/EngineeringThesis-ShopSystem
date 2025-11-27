using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET PRODUCT INFO ---
    public class GetProductDto
    {
                                                public int Id                       { get; set; }
                                                public string SKU                   { get; set; } = default!;
                                                public string Name                  { get; set; } = default!;
                                                public string Description           { get; set; } = default!;
                                                public decimal Price                { get; set; }
                                                public bool Defective               { get; set; }
                                                public string? DefectDescription    { get; set; }
                                                public int CategoryId               { get; set; }
                                                public int TaxRateId                { get; set; }
                                                public bool IsActive                { get; set; }
    }

    // --- GET PRODUCT LIST INFO ---
    public class GetProductListItemDto
    {
                                                public int Id                       { get; set; }
                                                public string SKU                   { get; set; } = default!;
                                                public string Name                  { get; set; } = default!;
                                                public decimal Price                { get; set; }
                                                public bool Defective               { get; set; }
                                                public int CategoryId               { get; set; }
                                                public bool IsActive                { get; set; }
    }

    // --- CREATE PRODUCT ---
    public class CreateProductDto
    {
        [Required, MaxLength(64)]               public string SKU                   { get; set; } = default!;
        [Required, MaxLength(64)]               public string Name                  { get; set; } = default!;
        [Required, MaxLength(256)]              public string Description           { get; set; } = default!;
        [Required, Range(0, double.MaxValue)]   public decimal Price                { get; set; }
                                                public bool Defective               { get; set; }
        [MaxLength(256)]                        public string? DefectDescription    { get; set; }
        [Required]                              public int CategoryId               { get; set; }
        [Required]                              public int TaxRateId                { get; set; }
    }

    // --- UPDATE PRODUCT ---
    public class UpdateProductDto
    {
        [Required, MaxLength(64)]               public string SKU                   { get; set; } = default!;
        [Required, MaxLength(64)]               public string Name                  { get; set; } = default!;
        [Required, MaxLength(256)]              public string Description           { get; set; } = default!;
        [Required, Range(0, double.MaxValue)]   public decimal Price                { get; set; }
                                                public bool Defective               { get; set; }
        [MaxLength(256)]                        public string? DefectDescription    { get; set; }
        [Required]                              public int CategoryId               { get; set; }
        [Required]                              public int TaxRateId                { get; set; }
    }

    // --- ACTIVE PRODUCT (for dropdown selection) ---
    public class ActiveProductDto
    {
                                                public int ProductId                { get; set; }
                                                public string SKU                   { get; set; } = default!;
                                                public string Name                  { get; set; } = default!;
    }
}
