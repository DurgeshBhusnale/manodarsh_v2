; CRPF Mental Health & Wellness System
; Professional Inno Setup Installer Script
; Version: 1.0
; Compatible with: Windows 10/11 64-bit

#define MyAppName "CRPF Mental Health System"
#define MyAppVersion "1.0"
#define MyAppPublisher "CRPF Development Team"
#define MyAppURL "https://crpf.gov.in"
#define MyAppExeName "CRPF_System.exe"
#define MyAppDescription "Mental Health & Wellness Monitoring System"

[Setup]
; Basic Application Information
AppId={{A5F8B3C2-CRPF-4D1E-8F9A-2B7C3D4E5F6A}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppComments={#MyAppDescription}

; Installation Directories
DefaultDirName={autopf}\CRPF_System
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output Configuration
OutputDir=output
OutputBaseFilename=CRPF_System_Setup
SetupIconFile=assets\sathi_logo.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; Compression
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
LZMADictionarySize=1048576
LZMANumFastBytes=273

; Installer UI
WizardStyle=modern
WizardImageFile=assets\wizard_image.bmp
WizardSmallImageFile=assets\wizard_small.bmp
DisableWelcomePage=no

; System Requirements
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0
PrivilegesRequired=admin

; Uninstaller
UninstallDisplayName={#MyAppName}
UninstallFilesDir={app}\uninstall

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: checkedonce
Name: "startmenu"; Description: "Create a Start &Menu folder"; GroupDescription: "Additional icons:"; Flags: checkedonce
Name: "startup"; Description: "Start CRPF System with &Windows (auto-start on boot)"; GroupDescription: "Startup options:"; Flags: unchecked

[Files]
; Main application files
Source: "package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Note: package\ folder should contain: python\, mysql\, app\, config\, etc.

[Dirs]
CreateDir: "{app}\logs"
CreateDir: "{app}\.pids"
CreateDir: "{app}\mysql\data"

[Icons]
; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; Comment: "Launch {#MyAppName}"; IconFilename: "{app}\{#MyAppExeName}"

; Start Menu shortcuts
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startmenu; Comment: "Launch {#MyAppName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"; Tasks: startmenu

; Startup (auto-start with Windows)
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--silent"; Tasks: startup; Comment: "Auto-start CRPF System on boot"

[Run]
; Initialize database on first install
Filename: "{app}\python\python.exe"; Parameters: """{app}\deployment\init_database.py"""; StatusMsg: "Initializing database (first-time setup)..."; Flags: runhidden waituntilterminated

; Option to launch after installation
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName} now"; Flags: nowait postinstall skipifsilent shellexec

[UninstallRun]
; Stop the application before uninstalling
Filename: "{app}\{#MyAppExeName}"; Parameters: "--stop"; Flags: runhidden; RunOnceId: "StopCRPFSystem"

[UninstallDelete]
; Clean up log files
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\.pids"

[Code]
var
  KeepDataPage: TInputOptionWizardPage;
  
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  AppRunning: Boolean;
begin
  Result := True;
  
  // Check if application is currently running
  if CheckForMutexes('CRPF_System_Running') then
  begin
    AppRunning := True;
    if MsgBox('CRPF Mental Health System is currently running.' + #13#10 + 
              'Setup must close it before continuing.' + #13#10#13#10 + 
              'Do you want to close it now and continue?', 
              mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    begin
      // Try to stop the application gracefully
      Exec(ExpandConstant('{app}\CRPF_System.exe'), '--stop', '', SW_HIDE, 
           ewWaitUntilTerminated, ResultCode);
      Sleep(2000);
      Result := True;
    end
    else
    begin
      Result := False;
    end;
  end;
end;

procedure InitializeWizard();
begin
  // Create custom page for uninstall options
  KeepDataPage := CreateInputOptionPage(wpWelcome,
    'Installation Type', 
    'Choose installation options',
    'Setup will install CRPF Mental Health System on your computer. ' +
    'The system requires approximately 1.5 GB of disk space.',
    False, False);
    
  KeepDataPage.Add('Express Installation (Recommended)');
  KeepDataPage.Add('Custom Installation (Advanced)');
  KeepDataPage.Values[0] := True;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  
  // Validate installation directory has enough space
  if CurPageID = wpSelectDir then
  begin
    if GetSpaceOnDisk(ExpandConstant('{app}'), False, nil) < (1500 * 1024 * 1024) then
    begin
      MsgBox('Not enough disk space. Please select a different location.' + #13#10 +
             'Required: 1.5 GB', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  MySQLDataDir: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Initialize MySQL data directory if needed
    MySQLDataDir := ExpandConstant('{app}\mysql\data');
    
    if not DirExists(MySQLDataDir + '\mysql') then
    begin
      // Run MySQL initialization
      Exec(ExpandConstant('{app}\mysql\bin\mysqld.exe'), 
           '--initialize-insecure --datadir="' + MySQLDataDir + '"',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
    
    // Create marker file for first run
    SaveStringToFile(ExpandConstant('{app}\.first_run'), '1', False);
  end;
end;

function InitializeUninstall(): Boolean;
var
  Response: Integer;
begin
  Result := True;
  
  Response := MsgBox('Are you sure you want to uninstall CRPF Mental Health System?' + #13#10#13#10 +
                     'This will remove the application but database data can be preserved.',
                     mbConfirmation, MB_YESNO or MB_DEFBUTTON2);
  
  if Response = IDNO then
    Result := False;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Response: Integer;
  DataDir: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Ask if user wants to keep data
    Response := MsgBox('Do you want to delete all application data?' + #13#10#13#10 +
                       'This includes:' + #13#10 +
                       '  • Database files' + #13#10 +
                       '  • Configuration files' + #13#10 +
                       '  • Log files' + #13#10#13#10 +
                       'Choose NO to keep data for future installations.',
                       mbConfirmation, MB_YESNO or MB_DEFBUTTON2);
    
    if Response = IDYES then
    begin
      // Delete all data
      DelTree(ExpandConstant('{app}\mysql\data'), True, True, True);
      DelTree(ExpandConstant('{app}\logs'), True, True, True);
      DelTree(ExpandConstant('{app}\config'), True, True, True);
    end;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  
  // Skip program group page if user chose express installation
  if (PageID = wpSelectProgramGroup) and (KeepDataPage.Values[0]) then
    Result := True;
end;

[Messages]
WelcomeLabel1=Welcome to [name] Setup
WelcomeLabel2=This will install [name/ver] on your computer.%n%nThe CRPF Mental Health & Wellness System is a comprehensive tool for monitoring and supporting the mental health of CRPF personnel.%n%nIt is recommended that you close all other applications before continuing.
FinishedHeadingLabel=Completing [name] Setup
FinishedLabelNoIcons=Setup has successfully installed [name] on your computer.
FinishedLabel=Setup has successfully installed [name] on your computer. The application may be launched by selecting the installed shortcuts.
ClickFinish=Click Finish to exit Setup and launch the application.

[CustomMessages]
InstallingMsg=Installing CRPF System components...
DatabaseMsg=Setting up database...
ConfigMsg=Configuring system...
