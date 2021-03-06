import { Component, ViewEncapsulation } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import {MatDialog} from '@angular/material/dialog';



@Component({
    selector: 'buka-forum',
    templateUrl: './buka-forum.html',
    styleUrls: ["buka-forum.css"],
    encapsulation: ViewEncapsulation.None
})
export class BukaForum {
    id = "";
    _id = sessionStorage.getItem("_id");
    logged_in = !sessionStorage.getItem("_id") ? false : true;
    show = 5;
    isiKirim = {
        id_op: "",
        isi_pesan: "",
        idPesan: null
    }
    metadata = {
        pesanUtama: "",
        originalPoster: "",
        idOP: "",
        judul: "",
        ProfilePicture: "",
        lastEdited: null
    }
    body = { arr: [], idPesan: "" }
    listPesan = [];
    metadataForum = [];
    page = [1];
    crnPage = 1;
    notFound = 0;
    focusTo = "";
    Edit = false;
    constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, private snackBar: MatSnackBar, private clipboard: Clipboard) { }
    // public Editor = ClassicEditor.create(document.querySelector("#editor"), { cloudServices: { tokenUrl: "http://localhost:3000/api/forum/TokenuploadImage", uploadUrl: "http://localhost:3000/api/forum/uploadImage" } });

    public TinyMce = {
        height: 500,
        menubar: false,
        plugins: [
            'advlist autolink lists link image charmap print preview anchor',
            'searchreplace visualblocks code codesample fullscreen',
            'insertdatetime media table paste code help wordcount'
        ],
        toolbar:
            'undo redo | formatselect | codesample bold italic backcolor | \
          alignleft aligncenter alignright alignjustify | \
          bullist numlist outdent indent | removeformat | link image media | help',

        selector: 'textarea',
        images_upload_handler: function (blobInfo, success, failure) {
            var xhr, formData;

            xhr = new XMLHttpRequest();
            xhr.withCredentials = false;
            xhr.open('POST', 'http://localhost:3000/api/forum/img_pesan');

            xhr.onload = function () {
                if (xhr.responseText.startsWith("Fail")) return failure(xhr.responseText);
                else success(xhr.responseText);
            };

            formData = new FormData();
            formData.append('file', blobInfo.blob(), blobInfo.filename());

            xhr.send(formData);
        }
    }


    async ngOnInit(id) {
        console.log(this.router.url)
        if (!id || this.id.length < 1) {
            this.id = this.route.snapshot.paramMap.get("id");
        }



        this.body.arr = [this.id]
        try { this.metadataForum = (await this.http.post('http://localhost:3000/api/forum/metadata', this.body).toPromise()) as any[]; }
        catch (err) { if (err) return this.notFound = 1; }

        this.listPesan = (await this.http.post('http://localhost:3000/api/forum/pesan/list', this.body).toPromise()) as any[];

        for (let ph of this.metadataForum) {
            this.metadata.judul = ph.namaForum
            this.metadata.pesanUtama = ph.pesanUtama
            this.metadata.originalPoster = ph.originalPoster
            this.metadata.idOP = ph.idOP
            this.metadata.ProfilePicture = ph.ProfilePicture
            this.metadata.lastEdited = ph.lastEdited
        }

        this.page = [1]
        for (let index = 1; index < Math.ceil(this.listPesan.length / this.show); index) {
            this.page.push(++index)
        }

        this.focusTo = this.route.snapshot.paramMap.get("msg");
        if (this.focusTo != null) {
            this.router.navigate(['../forum/buka', { id: this.id }]);

            var i = 1, r = 0;
            for (let v of this.listPesan) {
                if (v.idPesan == this.focusTo) r = i;
                else i++
            }

            if (r > 0) {
                this.crnPage = Math.ceil(r / this.show)
                setTimeout(() => {
                    window.location.hash = `#${this.focusTo}`
                    document.getElementById(this.focusTo).style.animation = "fadeIn ease 5s"
                }, 250);
            }
            else {
                this.snackBar.open(`Wah, sepertinya kamu menginput tag pesan yang sudah tidak ada :(`, "Ok")
                    .onAction().subscribe(() => {
                        this.snackBar.dismiss()
                    });
            }
        }
    }

    async kirim() {
        this.isiKirim.id_op = this._id;
        this.body.arr = [this.id, this.isiKirim.isi_pesan, this.isiKirim.id_op]
        await this.http.post("http://localhost:3000/api/forum/pesan/tambahpesan", this.body).toPromise();
        this.isiKirim.isi_pesan = "";
        this.isiKirim.id_op = "";
        this.isiKirim.idPesan = null;
        this.ngOnInit(this.id);
        this.crnPage = this.page.length
    }
    async hapus(id) {
        this.body.idPesan = id;
        await this.http
            .post('http://localhost:3000/api/pesan/hapus', this.body)
            .toPromise();
        this.ngOnInit(this.id);
    }
    async edit(id) {
        this.body.idPesan = id;
        var temp = await this.http
            .post('http://localhost:3000/api/pesan/metadata', this.body)
            .toPromise() as any[];
        for (let ph of temp) {
            this.isiKirim.isi_pesan = ph.isiPesan
            this.isiKirim.id_op = ph.idOP
            this.isiKirim.idPesan = ph.idPesan
        }
        this.Edit = true;
        this.ngOnInit(this.id);
        window.location.hash = `#editor`
    }

    async confirm_edit() {
        this.body.arr = [this.id, this.isiKirim.idPesan, this.isiKirim.isi_pesan, this.isiKirim.id_op]

        await this.http
            .post('http://localhost:3000/api/pesan/edit', this.body)
            .toPromise() as any[];
        this.isiKirim.isi_pesan = "";
        this.isiKirim.id_op = "";
        this.isiKirim.idPesan = null;
        this.Edit = false;
        this.ngOnInit(this.id)
    }
    async next_page(page) {
        this.crnPage = page
    }
    alertHapus(id) {
        this.snackBar.open(`Hapus pesan?`, "Hapus", { duration: 5000 })
            .onAction().subscribe(() => {
                this.hapus(id)
            });
    }
    verboseTime(time) {
        return new Date(time).toUTCString()
    }
    back() {
        this.router.navigate(['../forum'])
    }
    async balas(idPesan) {
        this.body.idPesan = idPesan;
        var temp = await this.http
            .post('http://localhost:3000/api/pesan/metadata', this.body)
            .toPromise() as any[];
        for (let ph of temp) this.isiKirim.isi_pesan += `<blockquote cite="${window.location.host}/forum/buka;id=${this.id};msg=${ph.idPesan}">${ph.isiPesan}</blockquote> <a href="${window.location.host}/forum/buka;id=${this.id};msg=${ph.idPesan}">@${ph.originalPoster}</a>&nbsp`
        window.location.hash = `#editor`
    }
    copylink(idPesan) {
        this.snackBar.open(`Link pesan berhasil tersimpan di clipboard kamu!`, null, { duration: 3000 })
        var link = `${window.location.host}/forum/buka;id=${this.id};msg=${idPesan}`
        this.clipboard.copy(link)
    }

    toLogin() { this.router.navigate(['login']) }

}

