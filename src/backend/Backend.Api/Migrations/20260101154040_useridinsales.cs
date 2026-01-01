using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class useridinsales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "SalesDocuments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Update existing records to use the first available user (typically Root user with Id=8)
            migrationBuilder.Sql(@"
                UPDATE SalesDocuments
                SET UserId = (SELECT TOP 1 Id FROM Users ORDER BY Id)
                WHERE UserId = 0
            ");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocuments_UserId",
                table: "SalesDocuments",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesDocuments_Users_UserId",
                table: "SalesDocuments",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesDocuments_Users_UserId",
                table: "SalesDocuments");

            migrationBuilder.DropIndex(
                name: "IX_SalesDocuments_UserId",
                table: "SalesDocuments");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "SalesDocuments");
        }
    }
}
