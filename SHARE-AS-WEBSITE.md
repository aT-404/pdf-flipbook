# Put PDF Flipbook online (for the person who shares it)

This file is for **you, the teacher or organizer**, not for the students.

If you put the app online as a website, your students only open a link.
They do **not** need to install anything, and it also works on **phones and tablets**.

The app is a plain static website, so any simple web host can show it.
Their PDFs still stay on their own device. Nothing is uploaded.

## Steps (about 5 minutes, done once by you)

1. Do the normal set-up on your own computer (see `README.md`, Steps 1 to 3).
2. Make the website files. Open a Terminal (Mac) or Command Prompt (Windows) inside the project folder and run:

   ```
   npm run build
   ```

3. A new folder called **`out`** appears inside the project folder. This folder IS the website.
4. Upload the **`out`** folder to a free web host. Two easy choices:
   - **Netlify** (netlify.com): sign in, find the option to deploy by dragging a folder ("Netlify Drop"), and drag the `out` folder onto it.
   - **Cloudflare Pages** or **Vercel**: create a new project, choose to upload files directly, and upload the `out` folder.
5. The host gives you a link. Send that link to your students.

## Good to know

- Put the site at the **main address** of the link (for example `https://my-flipbook.netlify.app/`), not inside a sub-folder.
  The app looks for its files from the main address.
- When you change the app later, run `npm run build` again and upload the new `out` folder.
- Each student's PDF is opened inside their own browser. You never see it.

## Want to send just one finished book instead?

You do not need a website for that. Open the PDF in the app and click **Download as flipbook**.
It saves one file that anyone can open by double-clicking it. See `README.md`, "Send your book to someone else".
