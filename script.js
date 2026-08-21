const SUPABASE_URL = "https://abddrgnqfnlvcgsyapie.supabase.co";
const SUPABASE_KEY = "sb_publishable_eyjEE826WAvTfFZq94bbcQ_Sh_Qbarx";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase connected!");


// =========================
// LOGIN
// =========================

const loginButton = document.getElementById("loginButton");

loginButton.addEventListener("click", async function () {

    const studentId = document.getElementById("studentId").value.trim();
    const password = document.getElementById("password").value;

    if (!studentId || !password) {
        alert("Please enter your Student ID and password.");
        return;
    }

   const email =
    studentId
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_") +
    "@students.local";

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {
        alert("Login failed. Check your Student ID and password.");
        console.error(error);
        return;
    }

    console.log("Login successful!");

    const user = data.user;


    // =========================
    // CHECK USER ROLE
    // =========================

    const { data: roleData, error: roleError } =
        await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

    if (roleError) {
        console.error(roleError);
        alert("Could not determine your account role.");
        return;
    }

    console.log("User role:", roleData.role);


    // =========================
    // ADMIN
    // =========================

    if (roleData.role === "admin") {

        document.getElementById("loginSection").style.display = "none";

        document.getElementById("adminSection").style.display = "block";

        return;
    }


    // =========================
    // STUDENT
    // =========================

    const { data: student, error: studentError } =
        await supabaseClient
            .from("students")
            .select("student_id, name")
            .eq("auth_user_id", user.id)
            .single();

    if (studentError) {
        console.error(studentError);
        alert("Could not find your student profile.");
        return;
    }


    // =========================
    // GET RESULTS
    // =========================

    const { data: results, error: resultsError } =
        await supabaseClient
            .from("results")
            .select("course, result")
            .eq("student_id", student.student_id);

    if (resultsError) {
        console.error(resultsError);
        alert("Could not load your results.");
        return;
    }


    // =========================
    // SHOW STUDENT RESULT
    // =========================

    document.getElementById("loginSection").style.display = "none";

    document.getElementById("resultSection").style.display = "block";

    document.getElementById("studentName").textContent = student.name;

    document.getElementById("displayStudentId").textContent =
        student.student_id;


    // =========================
    // CREATE RESULT TABLE
    // =========================

    const resultsTable = document.getElementById("resultsTable");

    resultsTable.innerHTML = "";

    results.forEach(function (result) {

    const row = document.createElement("tr");

    const courseCell = document.createElement("td");
    courseCell.textContent = result.course;

    const gradeCell = document.createElement("td");
    gradeCell.textContent = result.result;

    row.appendChild(courseCell);
    row.appendChild(gradeCell);

    resultsTable.appendChild(row);

});

});


// =========================
// STUDENT LOGOUT
// =========================

const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async function () {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error(error);
        alert("Logout failed.");
        return;
    }

    document.getElementById("resultSection").style.display = "none";

    document.getElementById("loginSection").style.display = "block";


document.getElementById("studentId").value = "";

    document.getElementById("password").value = "";

    console.log("Logged out successfully.");

});


// =========================
// ADMIN LOGOUT
// =========================

const adminLogoutButton =
    document.getElementById("adminLogoutButton");

adminLogoutButton.addEventListener("click", async function () {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error(error);
        alert("Logout failed.");
        return;
    }

    document.getElementById("adminSection").style.display = "none";

    document.getElementById("loginSection").style.display = "block";

    document.getElementById("studentId").value = "";

    document.getElementById("password").value = "";

    console.log("Admin logged out successfully.");

});
// =====
// RESULT FILE PREVIEW + VALIDATION
// =====

const resultFile = document.getElementById("resultFile");
const previewButton = document.getElementById("previewButton");
const previewSection = document.getElementById("previewSection");
const previewTable = document.getElementById("previewTable");

previewButton.addEventListener("click", async function () {

    if (!resultFile.files.length) {
        alert("Please choose a result file first.");
        return;
    }

    const file = resultFile.files[0];

    // =========================
// READ FILE
// =========================

let lines = [];

const fileName = file.name.toLowerCase();


// =========================
// EXCEL
// =========================

if (fileName.endsWith(".xlsx")) {

    try {

        const arrayBuffer = await file.arrayBuffer();

        const workbook = XLSX.read(
            arrayBuffer,
            { type: "array" }
        );

        const firstSheet =
            workbook.Sheets[workbook.SheetNames[0]];

        const rows =
            XLSX.utils.sheet_to_json(
                firstSheet,
                { header: 1 }
            );

        lines = rows.map(function (row) {
            return row.join(",");
        });

    } catch (error) {

        console.error(error);
        alert("Could not read the Excel file.");
        return;
    }

}


// =========================
// WORD
// =========================

else if (fileName.endsWith(".docx")) {

    try {

        const arrayBuffer = await file.arrayBuffer();

        const result =
            await mammoth.convertToHtml({
                arrayBuffer: arrayBuffer
            });

        const parser = new DOMParser();

        const document =
            parser.parseFromString(
                result.value,
                "text/html"
            );

        const table =
            document.querySelector("table");

        if (!table) {

            alert(
                "No table was found in the Word document."
            );

            return;
        }

        const rows =
            Array.from(
                table.querySelectorAll("tr")
            );

        lines = rows.map(function (row) {

            const cells =
                Array.from(
                    row.querySelectorAll("th, td")
                );

            return cells.map(function (cell) {
                return cell.textContent.trim();
            }).join(",");

        });

    } catch (error) {

        console.error(error);

        alert(
            "Could not read the Word document."
        );

        return;
    }

}


// =========================
// CSV
// =========================

else {

    try {

        const text = await file.text();

        lines = text
            .trim()
            .split(/\r?\n/);

    } catch (error) {

        console.error(error);

        alert("Could not read the CSV file.");
        return;
    }

}


    // =========================
    // CHECK EMPTY FILE
    // =========================

    if (lines.length < 2) {

        alert("The result file appears to be empty.");
        return;
    }


    previewTable.innerHTML = "";

    const validRows = [];
    const errors = [];


    // =========================
    // VALIDATE EACH ROW
    // =========================

    for (let i = 1; i < lines.length; i++) {

        const columns = lines[i].split(",");

        if (columns.length < 3) {

            errors.push(
                "Row " + (i + 1) +
                " — Invalid CSV/Excel format."
            );

            continue;
        }


        const studentId = columns[0].trim();
        const course = columns[1].trim();
        const grade = columns.slice(2).join(",").trim();


        // =========================
        // CHECK EMPTY FIELDS
        // =========================

        if (!studentId || !course || !grade) {

            errors.push(
                "Row " + (i + 1) +
                " — Missing student ID, course, or result."
            );

            continue;
        }


        // =========================
        // CHECK RESULT
        // =========================

        const resultValue = grade.trim();

        const validResult =
            /^[0-9]+(\.[0-9]+)?$/.test(resultValue) ||
            /^[A-Za-z][A-Za-z0-9+\- ]*$/.test(resultValue);

        if (!validResult) {

            errors.push(
                "Row " + (i + 1) +
                " — Invalid result: " +
                resultValue
            );

            continue;
        }


        // =========================
        // CHECK STUDENT EXISTS
        // =========================

        const {
            data: student,
            error
        } = await supabaseClient
            .from("students")
            .select("student_id")
            .eq("student_id", studentId)
            .single();


        if (error || !student) {

            errors.push(
                "Row " + (i + 1) +
                " — Student ID " +
                studentId +
                " does not exist."
            );

            continue;
        }


        // =========================
        // CHECK DUPLICATE
        // =========================
const duplicate = validRows.some(function (existing) {

            return (
                existing.student_id === studentId &&
                existing.course === course
            );

        });


        if (duplicate) {

            errors.push(
                "Row " + (i + 1) +
                " — Duplicate result: " +
                studentId +
                " - " +
                course
            );

            continue;
        }


        // =========================
        // SAVE VALID ROW
        // =========================

        validRows.push({
            student_id: studentId,
            course: course,
            result: grade
        });


        // =========================
        // CREATE PREVIEW ROW
        // =========================

        const row = document.createElement("tr");

        const studentCell =
            document.createElement("td");

        studentCell.textContent = studentId;


        const courseCell =
            document.createElement("td");

        courseCell.textContent = course;


        const gradeCell =
            document.createElement("td");

        gradeCell.textContent = grade;


        row.appendChild(studentCell);
        row.appendChild(courseCell);
        row.appendChild(gradeCell);

        previewTable.appendChild(row);
    }


    // =========================
    // SAVE VALIDATED RESULTS
    // =========================

    window.validatedResults = validRows;


    // =========================
    // UPDATE VALIDATION SUMMARY
    // =========================

    document.getElementById("validCount").textContent =
        validRows.length;

    document.getElementById("errorCount").textContent =
        errors.length;

    document.getElementById("validationStatus").textContent =
        errors.length === 0
            ? "✓ Ready to publish"
            : "✗ Fix the errors before publishing";


    previewSection.style.display = "block";


    // =========================
    // SHOW ERRORS
    // =========================

    if (errors.length > 0) {

        alert(
            "Upload check failed.\n\n" +
            "Valid records: " +
            validRows.length +
            "\nErrors: " +
            errors.length +
            "\n\n" +
            errors.join("\n")
        );

        return;
    }


    // =========================
    // ALL GOOD
    // =========================

    console.log(
        "Results validated successfully:",
        validRows
    );

    alert(
        validRows.length +
        " result records are valid and ready to publish."
    );

});
// =========================
// PUBLISH RESULTS
// =========================

const publishButton =
    document.getElementById("publishButton");

publishButton.addEventListener("click", async function () {

    if (!window.validatedResults ||
        window.validatedResults.length === 0) {

        alert("There are no validated results to publish.");

        return;
    }

const studentIds = [
    ...new Set(
        window.validatedResults.map(
            row => row.student_id
        )
    )
];

const { data: existingResults, error: existingError } =
    await supabaseClient
        .from("results")
        .select("student_id, course")
        .in("student_id", studentIds);

if (existingError) {
    console.error(existingError);

    alert(
        "Could not check existing results. " +
        "Nothing was published."
    );

    return;
}

let existingCount = 0;

window.validatedResults.forEach(function(row) {

    const alreadyExists = existingResults.some(
        function(existing) {

            return (
                existing.student_id === row.student_id &&
                existing.course === row.course
            );

        }
    );

    if (alreadyExists) {
        existingCount++;
    }
});

const newCount =
    window.validatedResults.length -
    existingCount;
   const confirmed = confirm(
    "PUBLISH RESULTS\n\n" +
    "Total records: " +
    window.validatedResults.length +
    "\n" +
    "New records: " +
    newCount +
    "\n" +
    "Existing records to update: " +
    existingCount +
    "\n\n" +
    "Existing records with the same " +
    "Student ID + Course will be updated.\n\n" +
    "Are you sure you want to continue?"
);


    if (!confirmed) {

        return;
    }

console.log("ABOUT TO PUBLISH:", window.validatedResults);
    const { data, error } =
        await supabaseClient
            .from("results")
            .upsert(
    window.validatedResults,
    {
        onConflict: "student_id,course",
        ignoreDuplicates: false
    }
)
            .select();


if (error) {
    console.error(
        "FULL PUBLISH ERROR:",
        JSON.stringify(error, null, 2)
    );

    alert(
        "Publishing failed. No results were published."
    );

    return;
}


    console.log("Published results:", data);


    alert(
        window.validatedResults.length +
        " result records published successfully!"
    );


    // Clear preview

    previewTable.innerHTML = "";

    previewSection.style.display = "none";

    csvFile.value = "";

    window.validatedResults = [];

});

// =====
// RESTORE EXISTING SESSION
// =====

async function restoreSession() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session check failed:", error);
        return;
    }

    const session = data.session;

    // Nobody logged in
    if (!session) {
        return;
    }

    console.log("Existing session found.");

    const user = session.user;

    // Check user's role
    const { data: roleData, error: roleError } =
        await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

    if (roleError) {
        console.error("Could not determine role:", roleError);
        return;
    }

    console.log("Restored role:", roleData.role);

    // Admin
    if (roleData.role === "admin") {

        document.getElementById("loginSection").style.display = "none";
        document.getElementById("adminSection").style.display = "block";

        return;
    }

    // Student
    const { data: student, error: studentError } =
        await supabaseClient
            .from("students")
            .select("student_id, name")
            .eq("auth_user_id", user.id)
            .single();

    if (studentError) {
        console.error("Could not find student:", studentError);
        return;
    }

    const { data: results, error: resultsError } =
        await supabaseClient
            .from("results")
            .select("course, result")
            .eq("student_id", student.student_id);

    if (resultsError) {
        console.error("Could not load results:", resultsError);
        return;
    }

    // Show student dashboard
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("resultSection").style.display = "block";

    document.getElementById("studentName").textContent =
        student.name;

    document.getElementById("displayStudentId").textContent =
        student.student_id;

    const resultsTable =
        document.getElementById("resultsTable");

    resultsTable.innerHTML = "";

    results.forEach(function(result) {

        const row =
            document.createElement("tr");

        const courseCell =
            document.createElement("td");

        courseCell.textContent =
            result.course;

        const resultCell =
            document.createElement("td");

        resultCell.textContent =
            result.result;

        row.appendChild(courseCell);
        row.appendChild(resultCell);

        resultsTable.appendChild(row);
    });
}
// Run session restoration
restoreSession();
