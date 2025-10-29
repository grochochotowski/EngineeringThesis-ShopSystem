using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Name), IsUnique = true)]
    public class Warehouse
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(128)] public string Name { get; set; } = default!;

        // --- Foreign Keys ---
        public int AddressId  { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;

        // --- Collections (N:N, 1:N) ---
        public ICollection<WarehouseProduct> WarehouseProducts { get; set; } = new List<WarehouseProduct>();
    }
}
