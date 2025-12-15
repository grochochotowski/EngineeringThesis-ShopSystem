using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    public class ShipmentProduct
    {
        // --- Key ---
        public int ShipmentId { get; set; }
        public int ProductId  { get; set; }

        // --- Key Navigation Properties ---
        public virtual Shipment Shipment { get; set; } = default!;
        public virtual Product Product   { get; set; } = default!;

        // --- Basic fields ---
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } = 1;
    }
}
