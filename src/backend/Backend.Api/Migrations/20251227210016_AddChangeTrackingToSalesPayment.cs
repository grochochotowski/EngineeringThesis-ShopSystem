using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddChangeTrackingToSalesPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AmountTendered",
                table: "SalesPayments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Change",
                table: "SalesPayments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesPayment_AmountTendered_NonNegative",
                table: "SalesPayments",
                sql: "[AmountTendered] IS NULL OR [AmountTendered] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesPayment_Change_NonNegative",
                table: "SalesPayments",
                sql: "[Change] IS NULL OR [Change] >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesPayment_AmountTendered_NonNegative",
                table: "SalesPayments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesPayment_Change_NonNegative",
                table: "SalesPayments");

            migrationBuilder.DropColumn(
                name: "AmountTendered",
                table: "SalesPayments");

            migrationBuilder.DropColumn(
                name: "Change",
                table: "SalesPayments");
        }
    }
}
