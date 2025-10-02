using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    public class WarehouseProduct
    {
        [Required] public int WarehouseId { get; set; }
        public virtual Warehouse Warehouse { get; set; } = default!;

        [Required] public int ProductId { get; set; }
        public virtual Product Product { get; set; } = default!;

        [Required, Range(0, int.MaxValue)] public int Quantity { get; set; }
    }
}
