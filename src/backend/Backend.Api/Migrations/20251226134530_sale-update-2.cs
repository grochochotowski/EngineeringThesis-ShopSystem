using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class saleupdate2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FromLocationId",
                table: "SalesDocumentItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocumentItems_FromLocationId",
                table: "SalesDocumentItems",
                column: "FromLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesDocumentItems_Locations_FromLocationId",
                table: "SalesDocumentItems",
                column: "FromLocationId",
                principalTable: "Locations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesDocumentItems_Locations_FromLocationId",
                table: "SalesDocumentItems");

            migrationBuilder.DropIndex(
                name: "IX_SalesDocumentItems_FromLocationId",
                table: "SalesDocumentItems");

            migrationBuilder.DropColumn(
                name: "FromLocationId",
                table: "SalesDocumentItems");
        }
    }
}
