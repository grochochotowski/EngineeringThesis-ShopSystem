using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.WarehouseDto
{
    public class CreateWarehouseDto
    {
        [Required, MaxLength(128)] public string Name { get; set; }

        [Range(1, int.MaxValue)] public int AddressId { get; set; }
    }
}
