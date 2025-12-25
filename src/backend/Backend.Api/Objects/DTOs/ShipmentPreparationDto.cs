using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    /// <summary>
    /// DTO for creating a new shipment product preparation record with source locations
    /// Used for outgoing shipments to track where products were taken from
    /// </summary>
    public class CreateShipmentProductPreparationDto
    {
        [Required]
        public int ProductId { get; set; }

        /// <summary>
        /// Location-quantity pairs where products were taken from
        /// Key: LocationId, Value: Quantity taken from that location
        /// </summary>
        [Required]
        [MinLength(1)]
        public List<LocationQuantityDto> SourceLocations { get; set; } = new();
    }

    /// <summary>
    /// Represents a location and the quantity of product taken from it
    /// </summary>
    public class LocationQuantityDto
    {
        [Required]
        public int LocationId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }
    }

    /// <summary>
    /// DTO for completing preparation of an entire outgoing shipment
    /// Contains all products prepared with their source locations
    /// </summary>
    public class CompletePreparationDto
    {
        [Required]
        public List<CreateShipmentProductPreparationDto> PreparedProducts { get; set; } = new();

        /// <summary>
        /// Indicates if this is the final preparation (true) or saving intermediate progress (false).
        /// When true: strict validation enforced, status changes to AwaitingPickup, dimensions required.
        /// When false: allows partial quantities, status remains InPreparation, dimensions optional.
        /// </summary>
        [Required]
        public bool IsFinishing { get; set; }

        /// <summary>
        /// Package dimensions - required when finishing preparation (IsFinishing = true)
        /// </summary>
        [Range(0.01, double.MaxValue, ErrorMessage = "Weight must be positive")]
        public decimal? Weight { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Length must be positive")]
        public decimal? Length { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Width must be positive")]
        public decimal? Width { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Height must be positive")]
        public decimal? Height { get; set; }
    }

    /// <summary>
    /// DTO for reading shipment product preparation data
    /// Includes product details, source location info, and preparation metadata
    /// </summary>
    public class GetShipmentProductPreparationDto
    {
        public int Id { get; set; }
        public int ShipmentId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = string.Empty;
        public int DeclaredQuantity { get; set; }
        public int PreparedQuantity { get; set; }
        public DateTimeOffset PreparedAt { get; set; }
        public int? PreparedByUserId { get; set; }
        public string? PreparedByUserName { get; set; }
    }

    /// <summary>
    /// Grouped view of preparation data by product
    /// Aggregates multiple source location entries for the same product
    /// </summary>
    public class GetShipmentProductPreparationGroupedDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int TotalDeclaredQuantity { get; set; }
        public int TotalPreparedQuantity { get; set; }
        public List<PreparationLocationDto> SourceLocations { get; set; } = new();
    }

    /// <summary>
    /// Source location detail within a grouped preparation view
    /// Shows where products were taken from for outgoing shipment
    /// </summary>
    public class PreparationLocationDto
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = string.Empty;
        public int Quantity { get; set; }

        /// <summary>
        /// Current quantity remaining in this location after the shipment was prepared
        /// </summary>
        public int QuantityLeft { get; set; }
    }
}
