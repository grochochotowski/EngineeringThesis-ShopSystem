using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET CLIENT INFO ---
    public class GetClientDto
    {
                                                    public int Id                       { get; set; }
                                                    public string Name                  { get; set; } = default!;
                                                    public string Email                 { get; set; } = default!;
                                                    public string PhoneNumber           { get; set; } = default!;
                                                    public ClientType Type              { get; set; }
                                                    public GetAddressDto? Address       { get; set; }
    }

    // --- CREATE CLIENT ---
    public class CreateClientDto
    {
        [Required, MaxLength(128)]                  public string Name                  { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress]     public string Email                 { get; set; } = default!;
        [Required, MaxLength(32), Phone]            public string PhoneNumber           { get; set; } = default!;
        [Required]                                  public ClientType Type              { get; set; }
        [Required]                                  public CreateAddressDto Address     { get; set; }
    }

    // --- UPDATE CLIENT ---
    public class UpdateClientDto
    {
        [Required, MaxLength(128)]                  public string Name                  { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress]     public string Email                 { get; set; } = default!;
        [Required, MaxLength(32), Phone]            public string PhoneNumber           { get; set; } = default!;
        [Required]                                  public ClientType Type              { get; set; }
        [Required]                                  public CreateAddressDto Address     { get; set; }
    }
}