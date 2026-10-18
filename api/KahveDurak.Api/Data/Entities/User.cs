namespace KahveDurak.Api.Data.Entities;

public static class Roles
{
    public const string Customer = "Customer";
    public const string Admin = "Admin";
}

public class User
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string Phone { get; set; }
    public required string PasswordHash { get; set; }
    public string Role { get; set; } = Roles.Customer;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
