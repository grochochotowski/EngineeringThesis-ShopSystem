using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET SHIPMENT INFO ---
    public class GetShipmentDto
    {
                                    public int Id                               { get; set; }
                                    public ShipmentType Type                    { get; set; }
                                    public ShipmentStatus Status                { get; set; }
                                    public DateTimeOffset? SendDate             { get; set; }
                                    public DateTimeOffset? DeliveryDate         { get; set; }

        // Parcel fields (dimensions)
                                    public string? Description                  { get; set; }
                                    public decimal? Weight                      { get; set; }
                                    public decimal? Length                      { get; set; }
                                    public decimal? Width                       { get; set; }
                                    public decimal? Height                      { get; set; }

        // Sender information
                                    public string? SenderName                   { get; set; }
                                    public string? SenderTaxId                  { get; set; }
                                    public int? SenderAddressId                 { get; set; }
                                    public string? SenderDetails                { get; set; }
                                    public GetAddressDto? SenderAddress         { get; set; }

        // Receiver information
                                    public string? ReceiverName                 { get; set; }
                                    public string? ReceiverTaxId                { get; set; }
                                    public int? ReceiverAddressId               { get; set; }
                                    public string? ReceiverDetails              { get; set; }
                                    public GetAddressDto? ReceiverAddress       { get; set; }

        // Products in shipment
                                    public IEnumerable<GetShipmentProductDto> ShipmentProducts { get; set; } = new List<GetShipmentProductDto>();
    }

    // --- GET SHIPMENT LIST ITEM ---
    public class GetShipmentListItemDto
    {
                                    public int Id                               { get; set; }
                                    public ShipmentType Type                    { get; set; }
                                    public ShipmentStatus Status                { get; set; }
                                    public DateTimeOffset? SendDate             { get; set; }
                                    public DateTimeOffset? DeliveryDate         { get; set; }
                                    public string? SenderName                   { get; set; }
                                    public string? ReceiverName                 { get; set; }
                                    public decimal? Weight                      { get; set; }
    }

    // --- CREATE SHIPMENT ---
    public class CreateShipmentDto
    {
        [Required]                  public ShipmentType Type                    { get; set; }
                                    public ShipmentStatus Status                { get; set; } = ShipmentStatus.InPreparation;

        // Dates (nullable until shipment is sent)
                                    public DateTimeOffset? SendDate             { get; set; }
                                    public DateTimeOffset? DeliveryDate         { get; set; }

        // Parcel fields (optional in InPreparation)
        [MaxLength(512)]            public string? Description                  { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Weight must be positive")]
                                    public decimal? Weight                      { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Length must be positive")]
                                    public decimal? Length                      { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Width must be positive")]
                                    public decimal? Width                       { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Height must be positive")]
                                    public decimal? Height                      { get; set; }

        // Sender information (optional in InPreparation)
        [MaxLength(128)]            public string? SenderName                   { get; set; }
        [MaxLength(32)]             public string? SenderTaxId                  { get; set; }
                                    public int? SenderAddressId                 { get; set; }
        [MaxLength(512)]            public string? SenderDetails                { get; set; }

        // Receiver information (optional in InPreparation)
        [MaxLength(128)]            public string? ReceiverName                 { get; set; }
        [MaxLength(32)]             public string? ReceiverTaxId                { get; set; }
                                    public int? ReceiverAddressId               { get; set; }
        [MaxLength(512)]            public string? ReceiverDetails              { get; set; }
    }

    // --- UPDATE SHIPMENT ---
    public class UpdateShipmentDto
    {
        [Required]                  public ShipmentType Type                    { get; set; }
        [Required]                  public ShipmentStatus Status                { get; set; }

        // Dates (nullable until shipment is sent)
                                    public DateTimeOffset? SendDate             { get; set; }
                                    public DateTimeOffset? DeliveryDate         { get; set; }

        // Parcel fields (must be provided when status is not InPreparation)
        [MaxLength(512)]            public string? Description                  { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Weight must be positive")]
                                    public decimal? Weight                      { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Length must be positive")]
                                    public decimal? Length                      { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Width must be positive")]
                                    public decimal? Width                       { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Height must be positive")]
                                    public decimal? Height                      { get; set; }

        // Sender information (must be provided when status is not InPreparation)
        [MaxLength(128)]            public string? SenderName                   { get; set; }
        [MaxLength(32)]             public string? SenderTaxId                  { get; set; }
                                    public int? SenderAddressId                 { get; set; }
        [MaxLength(512)]            public string? SenderDetails                { get; set; }

        // Receiver information (must be provided when status is not InPreparation)
        [MaxLength(128)]            public string? ReceiverName                 { get; set; }
        [MaxLength(32)]             public string? ReceiverTaxId                { get; set; }
                                    public int? ReceiverAddressId               { get; set; }
        [MaxLength(512)]            public string? ReceiverDetails              { get; set; }
    }

    // --- UPDATE STATUS ---
    public class UpdateShipmentStatusDto
    {
        [Required]                  public ShipmentStatus Status                { get; set; }
    }

    // --- ADD PRODUCTS ---
    public class AddProductsToShipmentDto
    {
        [Required, MinLength(1)]    public List<ShipmentProductItemDto> Products { get; set; } = new();
    }

    // --- REMOVE PRODUCTS ---
    public class RemoveProductsFromShipmentDto
    {
        [Required, MinLength(1)]    public List<int> ProductIds                 { get; set; } = new();
    }

    // --- SHIPMENT PRODUCT ITEM (for adding products) ---
    public class ShipmentProductItemDto
    {
        [Required]                                      public int ProductId    { get; set; }
        [Required, Range(1, int.MaxValue)]              public int Quantity     { get; set; }
    }
}
