using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Warehouse
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(128)] public string Name { get; set; }

        // relationships 1:1
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; } = default!;

        // relationships N:N
        public ICollection<WarehouseProduct> WarehouseProducts { get; set; } = new List<WarehouseProduct>();
    }
}
