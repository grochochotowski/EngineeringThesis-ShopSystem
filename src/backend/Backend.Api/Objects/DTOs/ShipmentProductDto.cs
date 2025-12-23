using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET SHIPMENT PRODUCT (junction table data with product details) ---
    public class GetShipmentProductDto
    {
                                    public int ShipmentId                       { get; set; }
                                    public int ProductId                        { get; set; }
                                    public int Quantity                         { get; set; }
                                    public int? CollectedQuantity               { get; set; }

        // Product details
                                    public string ProductSKU                    { get; set; } = default!;
                                    public string ProductName                   { get; set; } = default!;
                                    public decimal ProductPrice                 { get; set; }
    }

    // --- UPDATE SHIPMENT PRODUCT QUANTITY ---
    public class UpdateShipmentProductQuantityDto
    {
        [Required, Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
                                    public int Quantity                         { get; set; }
    }
}
