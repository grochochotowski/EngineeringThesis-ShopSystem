using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ParcelDto
{
    public class GetParcelDto
    {
        public int Id { get; set; }
        public string Description { get; set; }
        public decimal Weight { get; set; }
        public decimal Length { get; set; }
        public decimal Width { get; set; }
        public decimal Height { get; set; }
    }
}
