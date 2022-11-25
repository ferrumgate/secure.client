const { executeAppBuilder } = require('builder-util');
const { MSICreator } = require('electron-wix-msi');
const { readFile, writeFile } = require('fs/promises');
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser/src/fxp')

// find something in xml tree
function findTree(parent, child, obj, searchKey, searchValue) {
    if (obj == null || obj == undefined) return null;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            var result = findTree(child, obj, item, searchKey, searchValue);
            if (result)
                return result;
        }

    } else
        if (typeof obj === 'object')
            for (const key of Object.keys(obj)) {
                if (key == searchKey && obj[key] && typeof (obj[key]) === 'string' && obj[key] == searchValue)
                    return parent || previous || obj;
                else {
                    var result = findTree(child, obj, obj[key], searchKey, searchValue);
                    if (result)
                        return result;
                }
            }
    return null;

}

async function executeBuilder() {

    const fileContent = await readFile('./package.json');
    const packageJSON = JSON.parse(fileContent.toString());
    // Step 1: Instantiate the MSICreator

    const msiCreator = new MSICreator({
        appDirectory: 'C:\\Users\\test\\Desktop\\ferrum\\secure.client\\pack\\FerrumGateUI-win32-x64',
        outputDirectory: 'C:\\Users\\test\\Desktop\\ferrum\\secure.client\\dist\\win32',
        appIconPath: './src/assets/img/icon.ico',
        description: 'Zero Trust Application Access',
        exe: 'FerrumGateUI.exe',
        name: 'FerrumGate',
        shortName: 'FerrumGate',
        upgradeCode: '54a32f9e-7103-49f4-bf2f-29de5fca5bcd',
        manufacturer: 'FerrumGate',
        bundled: false,
        version: packageJSON.version,
        defaultInstallMode: 'perMachine',
        arch: 'x64',
        // Configure installer User Interface
        ui: {
            chooseDirectory: true,

        },
        extensions: ["WixUtilExtension", "WixNetFxExtension"]
    });


    // Step 2: Create a .wxs template file
    //const supportBinaries = await msiCreator.create();

    // 🆕 Step 2a: optionally sign support binaries if you
    // sign you binaries as part of of your packaging script
    //supportBinaries.forEach(async (binary) => {
    // Binaries are the new stub executable and optionally
    // the Squirrel auto updater.
    //await signFile(binary);
    // });
    const { wxsFile, wxsContent } = await msiCreator.create();
    console.log(wxsFile);

    const parser = new XMLParser({
        ignoreAttributes: false, ignoreDeclaration: false,
        ignorePiTags: false, parseAttributeValue: true, parseTagValue: true,
        commentPropName: '@_comment', cdataPropName: '@_cdata',
        preserveOrder: true
    });
    let msiObj = parser.parse(wxsContent);
    console.log(msiObj);
    //check net framework 4.6.2 at least installed
    msiObj[0].Wix[1].Product.splice(7, 0, {
        PropertyRef: [],
        ':@': { '@_Id': 'WIX_IS_NETFRAMEWORK_462_OR_LATER_INSTALLED' },

    })
    msiObj[0].Wix[1].Product.splice(8, 0, {
        Condition: [
            { '@_cdata': [{ '#text': `Installed OR WIX_IS_NETFRAMEWORK_462_OR_LATER_INSTALLED` }] }
        ],
        ':@': { '@_Message': 'This setup requires the .NET Framework 4.6.2 (or greater) to be installed.' },
    })

    // fix something


    msiObj[0].Wix[1][':@']['@_Name'] = msiCreator.name;
    const productnames = findTree(null, null, msiObj, '@_Id', 'VisibleProductName');
    const productname = productnames.filter(x => x[':@']).map(x => x[':@']).find(x => x['@_Id'] == 'VisibleProductName');
    if (!productname)
        throw new Error('productname not found');
    productname['@_Value'] = msiCreator.name;
    //install services
    //<ServiceInstall Id="ServiceInstaller" Name="FerrumGateService" DisplayName="FerrumGate"
    // Description="Zero Trust Application Access" Vital="yes" Account="LocalSystem" 
    // Start="auto" Type="ownProcess" ErrorControl="normal"  />
    //<ServiceControl Id="StartService" Start="install" Stop="both" Remove="uninstall" 
    //Name="FerrumGateService" Wait="yes"   />  

    const service = findTree(null, null, msiObj, '@_Name', 'FerrumGateService.exe');
    if (!service)
        throw new Error('service file not found');

    service.push({
        ServiceInstall: [],
        ':@': {
            '@_Id': "ServiceInstaller", '@_Name': "FerrumGateService", '@_DisplayName': "FerrumGate",
            '@_Description': "Zero Trust Application Access", '@_Vital': "yes", '@_Account': "LocalSystem",
            '@_Start': "auto", '@_Type': "ownProcess", '@_ErrorControl': "normal"
        }
    }),

        service.push({
            ServiceControl: [],
            ':@': {
                '@_Id': "StartService", '@_Start': "install", '@_Stop': "both", '@_Remove': "uninstall",
                '@_Name': "FerrumGateService", '@_Wait': "yes"
            }
        })


    const builder = new XMLBuilder({
        commentPropName: '@_comment', cdataPropName: '@_cdata',
        format: true,
        ignoreAttributes: false, ignoreDeclaration: false, ignorePiTags: false,
        parseAttributeValue: true, parseTagValue: true, preserveOrder: true
    });
    const xmlContent = builder.build(msiObj);
    await writeFile(wxsFile, xmlContent);
    // Step 3: Compile the template to a .msi file
    await msiCreator.compile();
}
executeBuilder().then(() => process.exit(0)).catch(err => {
    console.log(err);
})