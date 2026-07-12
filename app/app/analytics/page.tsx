import { getAnalyticsData } from "@/lib/actions/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Clock, CheckCircle, Users } from "lucide-react";

export const metadata = { title: "Analytics" };

function formatMinutes(mins: number | null): string {
  if (mins === null) return "N/A";
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${hrs}h ${m}m`;
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalConversations}</div>
              <p className="text-xs text-muted-foreground">
                All time conversations in this workspace
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckCircle className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.resolutionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {data.closedConversations} out of {data.totalConversations} closed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg First Response</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(data.avgFirstResponseMins)}</div>
              <p className="text-xs text-muted-foreground">
                Time until first agent reply
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(data.avgResolutionMins)}</div>
              <p className="text-xs text-muted-foreground">
                Time from creation to closure
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Agent Performance Leaderboard</CardTitle>
              <CardDescription>
                Top agents by number of conversations closed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Conversations Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.agentLeaderboard.map((agent) => (
                    <TableRow key={agent.agentId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-muted-foreground" />
                          {agent.agentName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{agent.closedCount}</TableCell>
                    </TableRow>
                  ))}
                  {data.agentLeaderboard.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                        No closed conversations assigned to agents yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
