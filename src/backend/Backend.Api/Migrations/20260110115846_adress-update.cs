using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class adressupdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses");

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses",
                columns: new[] { "Country", "City", "PostalCode", "Street", "Building", "Premises" },
                unique: true,
                filter: "[Building] IS NOT NULL AND [Premises] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses");

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses",
                columns: new[] { "Country", "City", "PostalCode", "Street", "Building", "Premises" },
                unique: true,
                filter: "[Premises] IS NOT NULL");
        }
    }
}
