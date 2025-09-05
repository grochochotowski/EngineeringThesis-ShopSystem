using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Address
    {
        [Key] public int Id { get; set; }
        [Required] public string Country { get; set; }
        [Required] public string City { get; set; }
        [Required] public string Street { get; set; }
        [Required] public string Building { get; set; }
        public string? Premises { get; set; }
        [Required] public string PostalCode { get; set; }

    }
}
