using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnDocumentSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "InventoryChanges");

            migrationBuilder.AddColumn<int>(
                name: "OriginalDocumentId",
                table: "SalesDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocuments_OriginalDocumentId",
                table: "SalesDocuments",
                column: "OriginalDocumentId");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesDocuments_SalesDocuments_OriginalDocumentId",
                table: "SalesDocuments",
                column: "OriginalDocumentId",
                principalTable: "SalesDocuments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesDocuments_SalesDocuments_OriginalDocumentId",
                table: "SalesDocuments");

            migrationBuilder.DropIndex(
                name: "IX_SalesDocuments_OriginalDocumentId",
                table: "SalesDocuments");

            migrationBuilder.DropColumn(
                name: "OriginalDocumentId",
                table: "SalesDocuments");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "InventoryChanges",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: true);
        }
    }
}
