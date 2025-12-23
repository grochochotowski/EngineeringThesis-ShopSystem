using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    /// <summary>
    /// DTO for creating a new shipment product collection record
    /// Simplified - locations handled via ProductsInWarehouse separately
    /// </summary>
    public class CreateShipmentProductCollectionDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required]
        [Range(0, int.MaxValue)]
        public int CollectedQuantity { get; set; }

        /// <summary>
        /// Locations where product was placed (multiple locations allowed)
        /// </summary>
        [Required]
        [MinLength(1)]
        public List<int> LocationIds { get; set; } = new();
    }

    /// <summary>
    /// DTO for completing collection of an entire shipment
    /// Contains all products collected with their locations
    /// </summary>
    public class CompleteCollectionDto
    {
        [Required]
        public List<CreateShipmentProductCollectionDto> CollectedProducts { get; set; } = new();
    }

    /// <summary>
    /// DTO for reading shipment product collection data
    /// Includes product details, location info, and collection metadata
    /// </summary>
    public class GetShipmentProductCollectionDto
    {
        public int Id { get; set; }
        public int ShipmentId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = string.Empty;
        public int DeclaredQuantity { get; set; }
        public int CollectedQuantity { get; set; }
        public DateTimeOffset CollectedAt { get; set; }
        public int? CollectedByUserId { get; set; }
        public string? CollectedByUserName { get; set; }

        /// <summary>
        /// Calculated property for UI color coding
        /// "exact" = green, "under" = red, "over" = yellow
        /// </summary>
        public string VarianceType =>
            CollectedQuantity == DeclaredQuantity ? "exact" :
            CollectedQuantity < DeclaredQuantity ? "under" :
            "over";

        /// <summary>
        /// Numeric difference between collected and declared
        /// Positive = over-delivery, Negative = under-delivery
        /// </summary>
        public int Variance => CollectedQuantity - DeclaredQuantity;
    }

    /// <summary>
    /// Grouped view of collection data by product
    /// Aggregates multiple location entries for the same product
    /// </summary>
    public class GetShipmentProductCollectionGroupedDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int TotalDeclaredQuantity { get; set; }
        public int TotalCollectedQuantity { get; set; }
        public List<CollectionLocationDto> Locations { get; set; } = new();

        public string VarianceType =>
            TotalCollectedQuantity == TotalDeclaredQuantity ? "exact" :
            TotalCollectedQuantity < TotalDeclaredQuantity ? "under" :
            "over";

        public int Variance => TotalCollectedQuantity - TotalDeclaredQuantity;
    }

    /// <summary>
    /// Location detail within a grouped collection view
    /// </summary>
    public class CollectionLocationDto
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }
}
