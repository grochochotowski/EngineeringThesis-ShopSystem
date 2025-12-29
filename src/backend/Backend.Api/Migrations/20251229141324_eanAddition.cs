using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class eanAddition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EAN",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EAN",
                table: "Products");
        }
    }
}
