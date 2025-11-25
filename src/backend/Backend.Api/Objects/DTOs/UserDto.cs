using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET USER INFO ---
    public class GetUserDto
    {
                                                public int Id                       { get; set; }
                                                public string FirstName             { get; set; } = default!;
                                                public string LastName              { get; set; } = default!;
                                                public string Email                 { get; set; } = default!;
                                                public string PhoneNumber           { get; set; } = default!;
                                                public DateTime DateOfBirth         { get; set; }
                                                public UserRole Role                { get; set; }
                                                public int AddressId                { get; set; }
                                                public GetAddressDto? Address      { get; set; }
                                                public bool IsActive                { get; set; }
    }

    // --- GET USER LIST INFO ---
    public class GetUserListItemDto
    {
                                                public int Id { get; set; }
                                                public string FirstName { get; set; } = default!;
                                                public string LastName { get; set; } = default!;
                                                public string Email { get; set; } = default!;
                                                public UserRole Role { get; set; }
    }

    // --- UPDATE USET INFO ---
    public class UpdateUserDto
    {
        [Required, MaxLength(64)]               public string FirstName             { get; set; } = default!;
        [Required, MaxLength(64)]               public string LastName              { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email                 { get; set; } = default!;
        [Required, MaxLength(32), Phone]        public string PhoneNumber           { get; set; } = default!;
        [Required]                              public DateTime DateOfBirth         { get; set; }
        [Required]                              public UserRole Role                { get; set; }
                                                public int? AddressId               { get; set; }
                                                public CreateAddressDto? Address    { get; set; }
    }
}
