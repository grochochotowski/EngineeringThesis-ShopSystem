using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.WarehouseDto
{
    public class GetWarehouseDto
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public int AddressId { get; set; }

    }
}
