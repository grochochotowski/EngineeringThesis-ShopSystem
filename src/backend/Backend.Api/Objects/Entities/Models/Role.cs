using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Role
    {
        [Key] public int Id { get; set; }
        [Required] public string Name { get; set; }
    }
}
