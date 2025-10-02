using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    public class ParcelProduct
    {
        [Required] public int ParcelId { get; set; }
        public virtual Parcel Parcel { get; set; } = default!;

        [Required] public int ProductId { get; set; }
        public virtual Product Product { get; set; } = default!;

        [Required, Range(1, int.MaxValue)] public int Quantity { get; set; }
    }
}
