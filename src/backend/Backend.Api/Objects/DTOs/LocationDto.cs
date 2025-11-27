using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET LOCATION INFO ---
    public class GetLocationDto
    {
        public int Id { get; set; }
        public string Zone { get; set; } = default!;
        public string Col { get; set; } = default!;
        public string Shelf { get; set; } = default!;
        public string LocationCode { get; set; } = default!;
        public int ProductCount { get; set; }
        public bool IsActive { get; set; }
    }

    // --- CREATE LOCATION ---
    public class CreateLocationDto
    {
        [Required, StringLength(4, MinimumLength = 4, ErrorMessage = "Zone must be exactly 4 characters")]
        public string Zone { get; set; } = default!;

        [Required, StringLength(4, MinimumLength = 4, ErrorMessage = "Col must be exactly 4 characters")]
        public string Col { get; set; } = default!;

        [Required, StringLength(4, MinimumLength = 4, ErrorMessage = "Shelf must be exactly 4 characters")]
        public string Shelf { get; set; } = default!;
    }

    // --- UPDATE LOCATION ---
    public class UpdateLocationDto
    {
        [Required, StringLength(4, MinimumLength = 4, ErrorMessage = "Zone must be exactly 4 characters")]
        public string Zone { get; set; } = default!;

        [Required, StringLength(4, MinimumLength = 4, ErrorMessage = "Col must be exactly 4 characters")]
        public string Col { get; set; } = default!;

        [Required, StringLength(4, MinimumLength = 4, ErrorMessage = "Shelf must be exactly 4 characters")]
        public string Shelf { get; set; } = default!;
    }

    // --- ADD PRODUCT TO LOCATION ---
    public class AddProductToLocationDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required]
        public int LocationId { get; set; }

        [Required, Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    // --- REMOVE PRODUCT FROM LOCATION ---
    public class RemoveProductFromLocationDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required]
        public int LocationId { get; set; }

        [Required, Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    // --- PRODUCT LOCATION INFO (for search results) ---
    public class ProductLocationInfoDto
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = default!;
        public int Quantity { get; set; }
    }

    // --- PRODUCT SEARCH RESULT ---
    public class ProductSearchResultDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = default!;
        public string SKU { get; set; } = default!;
        public decimal Price { get; set; }
        public string CategoryName { get; set; } = default!;
        public int TotalQuantity { get; set; }
        public List<ProductLocationInfoDto> Locations { get; set; } = new();
    }

    // --- LOCATION PRODUCT ITEM (for search results) ---
    public class LocationProductItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string ProductSKU { get; set; } = default!;
        public int Quantity { get; set; }
    }

    // --- LOCATION PRODUCTS RESULT ---
    public class LocationProductsResultDto
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = default!;
        public string Zone { get; set; } = default!;
        public string Col { get; set; } = default!;
        public string Shelf { get; set; } = default!;
        public int ProductCount { get; set; }
        public List<LocationProductItemDto> Products { get; set; } = new();
    }

    // --- PRODUCT-LOCATION ROW (FLATTENED) ---
    public class ProductLocationRowDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string ProductSKU { get; set; } = default!;
        public decimal ProductPrice { get; set; }
        public string ProductDescription { get; set; } = default!;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = default!;
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = default!;
        public int Quantity { get; set; }
    }

    // --- PRODUCT LOCATION BREAKDOWN (for aggregated view) ---
    public class ProductLocationBreakdownDto
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = default!;
        public int Quantity { get; set; }
    }

    // --- PRODUCT WITH LOCATIONS (AGGREGATED) ---
    public class ProductWithLocationsDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string ProductSKU { get; set; } = default!;
        public decimal ProductPrice { get; set; }
        public string ProductDescription { get; set; } = default!;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = default!;
        public int TotalQuantity { get; set; }
        public List<ProductLocationBreakdownDto> Locations { get; set; } = new();
    }
}
