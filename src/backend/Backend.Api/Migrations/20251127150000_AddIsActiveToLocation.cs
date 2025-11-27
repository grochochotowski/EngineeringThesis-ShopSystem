using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveToLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add the IsActive column with default value of true (1)
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Locations",
                type: "bit",
                nullable: false,
                defaultValue: true);

            // Step 2: Ensure all existing location records have IsActive = true
            // This SQL UPDATE ensures data consistency for any existing locations
            migrationBuilder.Sql(
                @"UPDATE [Locations]
                  SET [IsActive] = 1
                  WHERE [IsActive] IS NULL OR [IsActive] = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback: Simply drop the IsActive column
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Locations");
        }
    }
}
