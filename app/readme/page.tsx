import Sidebar from "../../components/sidebar"

export default function Page(){
    return(<div className="relative w-full h-full flex flex-row">
        <Sidebar />
        <div className="relative h-full w-fill bg-black">
        <h1>YO, Wassip</h1>
        <h3>README Page will be displayed here</h3>
        </div>
    </div>)
}