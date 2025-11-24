# Desktop Application Information

This document provides a summary of the desktop application.

## Project Structure

The desktop application is a Windows Presentation Foundation (WPF) application.

-   `Desktop.sln`: The solution file for the project.
-   `Desktop.csproj`: The C# project file for the application.

### Application Files

-   `App.xaml`: The declarative entry point for the application, defining application-level resources.
-   `App.xaml.cs`: The code-behind for `App.xaml`, containing the application's startup logic.

### Main Window

-   `MainWindow.xaml`: The XAML markup for the main window of the application, defining its UI structure.
-   `MainWindow.xaml.cs`: The code-behind for `MainWindow.xaml`, containing the logic for the main window's behavior.

### Configuration and Properties

-   `AssemblyInfo.cs`: Contains assembly information like version, company, etc.
-   `.vs/`: Visual Studio-specific files.
-   `bin/`: Contains the compiled output of the project.
-   `obj/`: Contains intermediate object files generated during compilation.
