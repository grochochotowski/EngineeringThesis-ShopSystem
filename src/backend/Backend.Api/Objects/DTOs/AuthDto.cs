using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- LOGIN ---
    public class LoginDto
    {
        [Required, MaxLength(64)]               public string Login                 { get; set; } = default!;
        [Required, MaxLength(128)]              public string Password              { get; set; } = default!;
    }

    // --- REGISTER ---
    public class RegisterUserDto
    {
        [Required, MaxLength(64)]               public string FirstName             { get; set; } = default!;
        [Required, MaxLength(64)]               public string LastName              { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email                 { get; set; } = default!;
        [Required, MaxLength(32), Phone]        public string PhoneNumber           { get; set; } = default!;
        [Required]                              public DateTime DateOfBirth         { get; set; }
        [Required]                              public UserRole Role                { get; set; }
        [Required, MaxLength(64)]               public string Login                 { get; set; } = default!;
        [Required, MaxLength(128)]              public string Password              { get; set; } = default!;
                                                public int? AddressId               { get; set; }
                                                public CreateAddressDto? Address    { get; set; }
    }

    // --- AUTH RESPONSE ---
    public class AuthUserDto
    {
                                                public int Id                       { get; set; }
                                                public string FirstName             { get; set; } = default!;
                                                public string LastName              { get; set; } = default!;
                                                public string Email                 { get; set; } = default!;
                                                public UserRole Role                { get; set; } = default!;
                                                public string AccessToken           { get; set; } = default!;
                                                public string RefreshToken          { get; set; } = default!;
    }

    // --- REFRESH TOKEN ---
    public class RefreshTokenDto
    {
        [Required]                              public string AccessToken           { get; set; } = default!;
        [Required]                              public string RefreshToken          { get; set; } = default!;
    }

    // --- CHANGE PASSWORD ---
    public class ChangePasswordDto
    {
                                                public int? UserId                  { get; set; }
        [MaxLength(128)]                        public string? CurrentPassword      { get; set; }
        [Required, MaxLength(128)]              public string NewPassword           { get; set; } = default!;
        [Required, MaxLength(128)]              public string ConfirmNewPassword    { get; set; } = default!;
    }
}
