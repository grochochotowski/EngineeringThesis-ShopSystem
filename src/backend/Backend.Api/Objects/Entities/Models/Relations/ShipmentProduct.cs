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
        /// <summary>
        /// Declared quantity in shipment manifest
        /// </summary>
        [Range(0, int.MaxValue)]
        public int Quantity { get; set; } = 0;

        /// <summary>
        /// Actually collected quantity (for incoming shipments)
        /// NULL = not collected yet
        /// 0 = collected but not received
        /// >0 = actual collected amount (can exceed declared quantity for overages)
        /// </summary>
        public int? CollectedQuantity { get; set; }
    }
}
