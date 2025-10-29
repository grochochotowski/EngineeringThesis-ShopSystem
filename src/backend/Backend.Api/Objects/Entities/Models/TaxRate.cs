using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.Web.CodeGenerators.Mvc.Templates.BlazorIdentity.Pages;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Code), IsUnique = true)]
    public class TaxRate
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(16)]     public string Code  { get; set; } = default!;
        [Precision(5, 4)]   public decimal Rate { get; set; };
                            public bool IsActive { get; set; } = true;
    }
}
