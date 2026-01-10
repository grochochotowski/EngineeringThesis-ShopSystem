using System.ComponentModel.DataAnnotations;
using Backend.Api.Objects.Entities.Enums;

namespace Backend.Api.Objects.DTOs
{
    // --- GET ADDRESS INFO ---
    public class GetAddressDto
    {
                                        public int Id                   { get; set; }
                                        public string Country           { get; set; } = default!;
                                        public string City              { get; set; } = default!;
                                        public string Street            { get; set; } = default!;
                                        public string? Building         { get; set; }
                                        public string? Premises         { get; set; }
                                        public string PostalCode        { get; set; } = default!;
    }

    // --- CREATE ADDRESS ---
    public class CreateAddressDto
    {
        [Required]                      public Country Country           { get; set; }
        [Required, MaxLength(64)]       public string City              { get; set; } = default!;
        [Required, MaxLength(128)]      public string Street            { get; set; } = default!;
        [MaxLength(16)]                 public string? Building         { get; set; }
        [MaxLength(16)]                 public string? Premises         { get; set; }
        [Required, MaxLength(16)]       public string PostalCode        { get; set; } = default!;
    }

    // --- UPDATE ADDRESS ---
    public class UpdateAddressDto
    {
        [Required]                      public Country Country           { get; set; }
        [Required, MaxLength(64)]       public string City              { get; set; } = default!;
        [Required, MaxLength(128)]      public string Street            { get; set; } = default!;
        [MaxLength(16)]                 public string? Building         { get; set; }
        [MaxLength(16)]                 public string? Premises         { get; set; }
        [Required, MaxLength(16)]       public string PostalCode        { get; set; } = default!;
    }

    // --- CHECK ADDRESS EXISTANCE ---
    public class AddressExistenceDto
    {
        [Required]                      public Country Country           { get; set; }
        [Required, MaxLength(64)]       public string City              { get; set; } = default!;
        [Required, MaxLength(128)]      public string Street            { get; set; } = default!;
        [MaxLength(16)]                 public string? Building         { get; set; }
        [MaxLength(16)]                 public string? Premises         { get; set; }
        [Required, MaxLength(16)]       public string PostalCode        { get; set; } = default!;
    }

    // --- NORMALIZATION ---
    static class Normalize
    {
        public static string S(string? x) => (x ?? string.Empty).Trim();
        public static string SLower(string? x) => (x ?? string.Empty).Trim().ToLower();
    }
}
